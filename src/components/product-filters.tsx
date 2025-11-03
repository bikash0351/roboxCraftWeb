
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type FilterState, type SortOption } from "@/hooks/use-product-filters";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

interface ProductFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  sort: SortOption;
  setSort: React.Dispatch<React.SetStateAction<SortOption>>;
  maxPrice: number;
  highestPrice: number;
}

const categories = ["Kits", "Components"];

export function ProductFilters({
  filters,
  setFilters,
  sort,
  setSort,
  maxPrice,
  highestPrice,
}: ProductFiltersProps) {

  const handleCategoryChange = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handlePriceChange = (value: number[]) => {
    setFilters(prev => ({ ...prev, maxPrice: value[0] }));
  };

  const handleStockChange = (checked: boolean) => {
    setFilters(prev => ({ ...prev, inStock: checked }));
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label className="font-semibold">Sort By</Label>
                 <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                    <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Select sorting" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                        <SelectItem value="name-asc">Name: A to Z</SelectItem>
                        <SelectItem value="name-desc">Name: Z to A</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Separator />
             <div>
                <Label className="font-semibold">Price Range</Label>
                <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>₹0</span>
                        <span>₹{maxPrice}</span>
                    </div>
                    <Slider
                        min={0}
                        max={highestPrice}
                        step={10}
                        value={[maxPrice]}
                        onValueChange={handlePriceChange}
                    />
                </div>
            </div>
             <Separator />
            <div>
                <Label className="font-semibold">Category</Label>
                <div className="mt-2 space-y-2">
                    {categories.map(category => (
                        <div key={category} className="flex items-center gap-2">
                            <Checkbox
                                id={`category-${category}`}
                                checked={filters.categories.includes(category)}
                                onCheckedChange={() => handleCategoryChange(category)}
                            />
                            <Label htmlFor={`category-${category}`} className="font-normal">{category}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <Separator />
            <div>
                <div className="flex items-center gap-2">
                    <Switch id="in-stock" checked={filters.inStock} onCheckedChange={handleStockChange} />
                    <Label htmlFor="in-stock" className="font-semibold">In Stock Only</Label>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
