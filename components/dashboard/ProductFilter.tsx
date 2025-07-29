'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, Search, Package, X } from 'lucide-react'

interface FilterOption {
  id: string
  label: string
  count: number
  color?: string
}

interface ProductFilterProps {
  categories: FilterOption[]
  brands: FilterOption[]
  selectedCategories: string[]
  selectedBrands: string[]
  onCategoryChange: (categories: string[]) => void
  onBrandChange: (brands: string[]) => void
  onClearAll: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function ProductFilter({
  categories,
  brands,
  selectedCategories,
  selectedBrands,
  onCategoryChange,
  onBrandChange,
  onClearAll,
  searchQuery,
  onSearchChange
}: ProductFilterProps) {
  const [showFilters, setShowFilters] = useState(false)
  
  const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0 || searchQuery.length > 0
  const totalFilters = selectedCategories.length + selectedBrands.length

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter(id => id !== categoryId))
    } else {
      onCategoryChange([...selectedCategories, categoryId])
    }
  }

  const toggleBrand = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      onBrandChange(selectedBrands.filter(id => id !== brandId))
    } else {
      onBrandChange([...selectedBrands, brandId])
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {totalFilters > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalFilters} active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3 mr-1" />
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showFilters ? 'Hide' : 'Show'} filters
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(categoryId => {
            const category = categories.find(c => c.id === categoryId)
            return category ? (
              <Badge
                key={categoryId}
                variant="secondary"
                className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                onClick={() => toggleCategory(categoryId)}
              >
                {category.label}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ) : null
          })}
          
          {selectedBrands.map(brandId => {
            const brand = brands.find(b => b.id === brandId)
            return brand ? (
              <Badge
                key={brandId}
                variant="secondary"
                className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                onClick={() => toggleBrand(brandId)}
              >
                {brand.label}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ) : null
          })}
          
          {searchQuery && (
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer"
              onClick={() => onSearchChange('')}
            >
              "{searchQuery}"
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          {/* Categories */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Categories
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map(category => (
                <label
                  key={category.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{category.count}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Brands</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {brands.map(brand => (
                <label
                  key={brand.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.id)}
                      onChange={() => toggleBrand(brand.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{brand.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{brand.count}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}