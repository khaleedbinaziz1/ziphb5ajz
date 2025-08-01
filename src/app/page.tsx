'use client';
import React, { Suspense, useRef, useState } from 'react';
import Hero1 from '../components/Hero/Hero1';
import TopCategories3 from '../components/TopCategories/TopCategories3';
import ProductSection1 from '../components/ProductSection/ProductSection1';

export default function Home() {
  const allProductsRef = useRef<HTMLDivElement>(null);
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState<string | null>(null);

  const handleCategoryBannerClick = (categoryName: string) => {
    setGlobalCategoryFilter(categoryName);
    setTimeout(() => {
      allProductsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen">
      <main>
        <Hero1 />
        
        <TopCategories3 onCategoryClick={handleCategoryBannerClick} />
        
        <Suspense fallback={<div>Loading products...</div>}>
          <ProductSection1
            categoryFilter={globalCategoryFilter}
            allProductsRef={allProductsRef}
          />
        </Suspense>
      </main>
    </div>
  );
}