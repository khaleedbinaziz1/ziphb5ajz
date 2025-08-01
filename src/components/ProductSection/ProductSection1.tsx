
"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Filter, ChevronDown, X, Search } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/Cart/CartProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { useApiConfig } from "../../context/ApiConfigContext";
import { useAuth } from "../../context/AuthContext";

interface Product {
  _id: string;
  name: string;
  brand?: string;
  category: string;
  sku?: string;
  costPrice?: string;
  regularPrice?: string;
  salePrice: string;
  stockStatus?: string;
  stockNumber?: string;
  showProduct?: boolean;
  hasExpirationDate?: boolean;
  expirationDate?: string | null;
  hasVariations?: boolean;
  variations?: unknown[];
  description?: string;
  images?: string[];
}

interface Category {
  _id: string;
  name: string;
  img?: string;
  banner?: string;
  show?: boolean;
}

export interface ProductSection1Props {
  categoryFilter?: string | null;
  allProductsRef?: React.RefObject<HTMLDivElement | null>;
}

function ProductSection1Inner({ categoryFilter, allProductsRef }: ProductSection1Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, buyNow } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("price-asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [showFilters, setShowFilters] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const { apiBaseUrl } = useApiConfig();
  const { user } = useAuth();

  // Initialize search query from URL params
  useEffect(() => {
    const query = searchParams?.get("q") || "";
    setSearchQuery(query);
  }, [searchParams]);

  // Fetch products and categories
  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const productUrl = searchQuery
          ? `${apiBaseUrl}products?q=${encodeURIComponent(
              searchQuery
            )}${user?._id ? `&userId=${user._id}` : ''}`
          : `${apiBaseUrl}products${user?._id ? `?userId=${user._id}` : ''}`;

        const categoryUrl = user?._id 
          ? `${apiBaseUrl}categories?userId=${user._id}`
          : `${apiBaseUrl}categories`;

        const [productRes, categoryRes] = await Promise.all([
          axios.get(productUrl),
          axios.get(categoryUrl),
        ]);

        console.log("Products fetched:", productRes.data);
        console.log("Categories fetched:", categoryRes.data);

        const fetchedProducts = productRes.data || [];
        const fetchedCategories = categoryRes.data || [];

        setProducts(fetchedProducts);
        setCategories(fetchedCategories);

        const catMap: Record<string, string> = {};
        fetchedCategories.forEach((cat: Category) => {
          catMap[cat._id] = cat.name;
        });
        setCategoryMap(catMap);

        if (fetchedProducts.length > 0) {
          const prices = fetchedProducts.map(
            (p: Product) => parseFloat(p.salePrice) || 0
          );
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          setPriceRange([Math.floor(minPrice), Math.ceil(maxPrice)]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load products. Please try again later.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductsAndCategories();
  }, [searchQuery, apiBaseUrl, user?._id]);

  // Apply filters and sorting
  useEffect(() => {
    if (products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let result = [...products];

    if (selectedCategory !== "All") {
      result = result.filter((product) => {
        const categoryName = categoryMap[product.category];
        return (
          categoryName &&
          categoryName.toLowerCase() === selectedCategory.toLowerCase()
        );
      });
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((product) => {
        const categoryName = categoryMap[product.category] || "";
        return (
          (product.name && product.name.toLowerCase().includes(query)) ||
          categoryName.toLowerCase().includes(query) ||
          (product.description &&
            product.description.toLowerCase().includes(query)) ||
          (product.brand && product.brand.toLowerCase().includes(query))
        );
      });
    }

    result = result.filter((product) => {
      const price = parseFloat(product.salePrice) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    result.sort((a, b) => {
      const priceA = parseFloat(a.salePrice) || 0;
      const priceB = parseFloat(b.salePrice) || 0;

      switch (sortBy) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        default:
          return 0;
      }
    });

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [
    products,
    selectedCategory,
    sortBy,
    searchQuery,
    priceRange,
    categoryMap,
  ]);

  const resetFilters = useCallback(() => {
    setSelectedCategory("All");
    setSearchQuery("");
    setSortBy("price-asc");
    setCurrentPage(1);
    if (products.length > 0) {
      const prices = products.map((p) => parseFloat(p.salePrice) || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      setPriceRange([Math.floor(minPrice), Math.ceil(maxPrice)]);
    }
  }, [products]);

  const handleQuickView = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Removed unused currentItems
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Removed unused allCategories

  const minPrice =
    products.length > 0
      ? Math.min(...products.map((p) => parseFloat(p.salePrice) || 0))
      : 0;
  const maxPrice =
    products.length > 0
      ? Math.max(...products.map((p) => parseFloat(p.salePrice) || 0))
      : 10000;

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return numPrice ? numPrice.toFixed(0) : "0";
  };

  const allProductsFiltered = products.filter((product) => {
    if (!categoryFilter || categoryFilter === "All") return true;
    const categoryName = categoryMap[product.category];
    return (
      categoryName &&
      categoryName.toLowerCase() === categoryFilter.toLowerCase()
    );
  });

  const visibleCategories = categories.filter((cat: Category) => cat.show !== false);

  const showOnlyAllProducts = !!searchQuery && searchQuery.trim().length > 0;

  const handleCategoryBannerClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setCategoryDropdownOpen(false);
    setCurrentPage(1);
  };

  return (
    <section className="py-8 min-h-screen">
      <div className="container mx-auto px-4">
        {/* Mobile-optimized header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-4xl font-light text-primary mb-4 tracking-wide">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : "Featured Products"}
          </h2>
          <div className="w-16 md:w-24 h-px bg-primary mx-auto mb-4"></div>
          <p className="text-primary/70 max-w-2xl mx-auto text-sm md:text-lg leading-relaxed">
            {searchQuery
              ? `Found ${filteredProducts.length} products`
              : "Discover our latest collection of premium products"}
          </p>
        </div>

        {/* Expanded filters - mobile optimized */}
    <AnimatePresence>
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden mb-6"
        >
          <div className="bg-primary/5 p-4 border border-primary/20 rounded-md">
            <div className="space-y-4">
              <div>
                    <h3 className="font-medium text-primary mb-3 text-sm">
                      PRICE RANGE
                    </h3>
                <div className="space-y-3">
                  <input
                    type="range"
                        min={minPrice || 0}
                        max={maxPrice || 10000}
                    value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([
                            priceRange[0],
                            parseInt(e.target.value),
                          ])
                        }
                    className="w-full h-2 bg-primary/20 appearance-none cursor-pointer accent-primary rounded-lg"
                  />
                  <div className="flex justify-between text-sm text-primary/70 font-medium">
                    <span>৳{priceRange[0]}</span>
                    <span>৳{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={resetFilters}
                  className="text-sm text-primary hover:text-primary/70 font-medium"
                >
                  RESET FILTERS
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-sm text-primary/60 hover:text-primary/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

        {/* Error state */}
        {error && (
          <div className="bg-accent/10 border border-accent/30 p-4 text-center mb-8 rounded-md">
            <p className="text-accent font-medium text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-primary hover:text-primary/70"
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse bg-primary/5 overflow-hidden rounded-md"
              >
                <div className="aspect-square bg-primary/10"></div>
                <div className="p-3">
                  <div className="h-3 bg-primary/10 w-3/4 mb-2 rounded"></div>
                  <div className="h-2 bg-primary/10 w-1/2 mb-2 rounded"></div>
                  <div className="h-2 bg-primary/10 w-1/4 mb-3 rounded"></div>
                  <div className="h-8 bg-primary/10 w-full rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Only show per-category sections if not searching */}
        {!showOnlyAllProducts && visibleCategories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-primary/60 mb-4">
                  <h3 className="text-lg font-medium mb-2">
                    No categories to display
                  </h3>
              <p className="text-sm">No visible categories found.</p>
            </div>
          </div>
        )}
            {/* Only show per-category sections if not searching */}
            {!showOnlyAllProducts &&
              visibleCategories.map((category: Category) => {
                // Get up to 8 products for this category
          const categoryProducts = products
            .filter((product) => category._id === product.category)
            .slice(0, 8);
          if (categoryProducts.length === 0) return null;
          return (
            <div key={category._id} className="mb-12">
              {/* Banner */}
              {category.banner && (
                <div
                  className="w-full mb-6 rounded-lg overflow-hidden relative aspect-[7.5/1] bg-primary/5 cursor-pointer"
                  onClick={() => handleCategoryBannerClick(category.name)}
                >
                  <Image
                    src={category.banner}
                    alt={category.name + " banner"}
                    fill
                    className="object-cover object-center"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                  <div className="absolute left-0 bottom-0 p-4">
                    <h3 className="text-2xl bg-primary p-2 md:text-3xl font-bold text-white drop-shadow-lg">
                      {category.name}
                    </h3>
                  </div>
                </div>
              )}
              {/* Category name if no banner */}
              {!category.banner && (
                <h3
                  className="text-2xl md:text-3xl font-bold text-primary mb-4 cursor-pointer"
                  onClick={() => handleCategoryBannerClick(category.name)}
                >
                  {category.name}
                </h3>
              )}
              {/* Products grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                      {categoryProducts.map((product) => (
                        <motion.div
                          key={product._id}
                          className="group relative bg-accent border border-primary/20 overflow-hidden hover:border-primary transition-all duration-300 rounded-md shadow-sm hover:shadow-md"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div
                            onClick={() => handleQuickView(product._id)}
                            className="relative aspect-square w-full overflow-hidden bg-primary/5 cursor-pointer"
                          >
                            <Image
                              src={product.images?.[0] || "/placeholder.png"}
                              alt={product.name || "Product"}
                              fill
                              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                            {product.stockStatus === "OUT OF STOCK" && (
                              <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                                <span className="text-secondary font-medium text-sm">
                                  Out of Stock
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-2 md:p-3">
                            <h3 className="font-medium text-primary mb-1 text-xs md:text-sm line-clamp-2">
                              <button
                                onClick={() => handleQuickView(product._id)}
                                className="hover:text-primary/70 transition-colors text-left"
                              >
                                {product.name || "Unnamed Product"}
                              </button>
                            </h3>

                            {product.brand && (
                              <p className="text-xs text-primary/60 mb-1">
                                {product.brand}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-sm md:text-base font-semibold text-primary">
                                ৳{formatPrice(product.salePrice)}
                              </p>
                              {product.regularPrice &&
                                parseFloat(product.regularPrice) >
                                  parseFloat(product.salePrice) && (
                                  <p className="text-xs text-primary/50 line-through">
                                    ৳{formatPrice(product.regularPrice)}
                                  </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1 md:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(
                                    {
                                      ...product,
                                      salePrice:
                                        parseFloat(product.salePrice) || 0,
                                      images: product.images || [],
                                    },
                                    1
                                  );
                                }}
                                disabled={
                                  product.stockStatus === "OUT OF STOCK"
                                }
                                className="w-full bg-accent flex items-center justify-center p-1.5 md:p-2 hover:bg-primary hover:text-secondary transition-all duration-300 border border-primary/30 hover:border-primary text-xs md:text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Add to Cart"
                              >
                                <FiShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                Add To Cart
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  buyNow(
                                    {
                                      ...product,
                                      salePrice:
                                        parseFloat(product.salePrice) || 0,
                                      images: product.images || [],
                                    },
                                    1
                                  );
                                }}
                                disabled={
                                  product.stockStatus === "OUT OF STOCK"
                                }
                                className="w-full inline-flex items-center justify-center border border-accent bg-primary px-2 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white hover:bg-accent/10 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Buy Now
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
              </div>
            </div>
          );
        })}

        {/* All Products Section */}
        <div ref={allProductsRef as React.RefObject<HTMLDivElement>} className="mt-16">
          <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  All Products
                </h2>
            <div className="w-16 h-px bg-primary mx-auto mb-4"></div>
          </div>
          {/* Filters for all products */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary hover:bg-primary/90 transition-colors duration-200 text-sm font-medium rounded-md"
              >
                <Filter className="w-4 h-4" />
                FILTERS
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showFilters ? "rotate-180" : ""
                      }`}
                    />
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-primary/20 px-3 py-2 bg-accent text-primary text-sm font-medium rounded-md min-w-0 flex-1 max-w-[150px] focus:border-primary focus:outline-none"
              >
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
                {/* Category dropdown for all products */}
            <div className="relative">
              <button
                    onClick={() =>
                      setCategoryDropdownOpen(!categoryDropdownOpen)
                    }
                className="flex items-center justify-between w-full px-4 py-3 bg-accent border border-primary/20 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-medium text-primary rounded-md"
              >
                    <span className="text-sm">
                      {(categoryFilter || "All").toUpperCase()}
                    </span>

                    <ChevronDown
                      className={`w-4 h-4 text-primary/60 transition-transform ${
                        categoryDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-accent border border-primary/20 shadow-lg z-20 max-h-60 overflow-y-auto rounded-md">
                      {[
                        "All",
                        ...categories.map((category) => category.name),
                      ].map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors text-sm font-medium ${
                        selectedCategory === category
                          ? "bg-primary text-secondary hover:bg-primary/90"
                          : "text-primary"
                      }`}
                    >
                      {category.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
              {/* Expanded filters for all products */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="bg-primary/5 p-4 border border-primary/20 rounded-md">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-primary mb-3 text-sm">
                            PRICE RANGE
                          </h3>
                          <div className="space-y-3">
                            <input
                              type="range"
                              min={minPrice || 0}
                              max={maxPrice || 10000}
                              value={priceRange[1]}
                              onChange={(e) =>
                                setPriceRange([
                                  priceRange[0],
                                  parseInt(e.target.value),
                                ])
                              }
                              className="w-full h-2 bg-primary/20 appearance-none cursor-pointer accent-primary rounded-lg"
                            />
                            <div className="flex justify-between text-sm text-primary/70 font-medium">
                              <span>৳{priceRange[0]}</span>
                              <span>৳{priceRange[1]}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <button
                            onClick={resetFilters}
                            className="text-sm text-primary hover:text-primary/70 font-medium"
                          >
                            RESET FILTERS
                          </button>
                          <button
                            onClick={() => setShowFilters(false)}
                            className="lg:hidden text-sm text-primary/60 hover:text-primary/80"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          {/* All products grid */}
          {allProductsFiltered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {allProductsFiltered
                .slice(indexOfFirstItem, indexOfLastItem)
                    .map((product) => (
                      <motion.div
                        key={product._id}
                        className="group relative bg-accent border border-primary/20 overflow-hidden hover:border-primary transition-all duration-300 rounded-md shadow-sm hover:shadow-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          onClick={() => handleQuickView(product._id)}
                          className="relative aspect-square w-full overflow-hidden bg-primary/5 cursor-pointer"
                        >
                          <Image
                            src={product.images?.[0] || "/placeholder.png"}
                            alt={product.name || "Product"}
                            fill
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          />
                          {product.stockStatus === "OUT OF STOCK" && (
                            <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                              <span className="text-secondary font-medium text-sm">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 md:p-3">
                          <h3 className="font-medium text-primary mb-1 text-xs md:text-sm line-clamp-2">
                            <button
                              onClick={() => handleQuickView(product._id)}
                              className="hover:text-primary/70 transition-colors text-left"
                            >
                              {product.name || "Unnamed Product"}
                            </button>
                          </h3>
                          {product.brand && (
                            <p className="text-xs text-primary/60 mb-1">
                              {product.brand}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm md:text-base font-semibold text-primary">
                              ৳{formatPrice(product.salePrice)}
                            </p>
                            {product.regularPrice &&
                              parseFloat(product.regularPrice) >
                                parseFloat(product.salePrice) && (
                                <p className="text-xs text-primary/50 line-through">
                                  ৳{formatPrice(product.regularPrice)}
                                </p>
                              )}
                          </div>
                          <div className="flex flex-col gap-1 md:gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(
                                  {
                                    ...product,
                                    salePrice:
                                      parseFloat(product.salePrice) || 0,
                                    images: product.images || [],
                                  },
                                  1
                                );
                              }}
                              disabled={product.stockStatus === "OUT OF STOCK"}
                              className="w-full bg-accent flex items-center justify-center p-1.5 md:p-2 hover:bg-primary hover:text-secondary transition-all duration-300 border border-primary/30 hover:border-primary text-xs md:text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Add to Cart"
                            >
                              <FiShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              Add To Cart
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                buyNow(
                                  {
                                    ...product,
                                    salePrice:
                                      parseFloat(product.salePrice) || 0,
                                    images: product.images || [],
                                  },
                                  1
                                );
                              }}
                              disabled={product.stockStatus === "OUT OF STOCK"}
                              className="w-full inline-flex items-center justify-center border border-accent bg-primary px-2 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white hover:bg-accent/10 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-primary/60 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      No products found
                    </h3>
                    <p className="text-sm">
                      Try adjusting your filters or search terms
                    </p>
              </div>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-primary text-secondary text-sm font-medium hover:bg-primary/90 transition-colors rounded-md"
              >
                Reset Filters
              </button>
            </div>
          )}
              {/* Pagination for all products */}
          {allProductsFiltered.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex justify-center">
                  <nav
                    className="relative z-0 inline-flex border border-primary/20 rounded-md overflow-hidden"
                    aria-label="Pagination"
                  >
                <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 md:px-4 py-2 border-r border-primary/20 bg-accent text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                      <span className="sr-only">Previous</span>
                      <svg
                        className="h-4 w-4 md:h-5 md:w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                  </svg>
                </button>
                    {/* Show limited page numbers on mobile */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-2 md:px-4 py-2 text-sm font-medium ${
                        currentPage === page
                          ? "bg-primary text-secondary"
                          : "bg-accent border-r border-primary/20 text-primary hover:bg-primary/5"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 md:px-4 py-2 bg-accent text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                      <span className="sr-only">Next</span>
                      <svg
                        className="h-4 w-4 md:h-5 md:w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </section>
  );
}

const ProductSection1: React.FC<ProductSection1Props> = (props) => (
  <Suspense fallback={<div>Loading...</div>}>
    <ProductSection1Inner {...props} />
  </Suspense>
);

export default ProductSection1;
