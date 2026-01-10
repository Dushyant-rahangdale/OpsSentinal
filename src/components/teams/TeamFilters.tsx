'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function TeamFilters() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  const minMembers = searchParams?.get('minMembers') || '';
  const minServices = searchParams?.get('minServices') || '';
  const hasFilters = query || minMembers || minServices;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search & Filter Teams</CardTitle>
        <CardDescription>Find and organize your teams</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="get" className="space-y-4">
          {/* Search Bar */}
          <div className="space-y-2">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              name="q"
              type="text"
              placeholder="Search by team name or description..."
              defaultValue={query}
            />
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minMembers">Minimum Members</Label>
              <Input
                id="minMembers"
                name="minMembers"
                type="number"
                min="0"
                placeholder="e.g., 5"
                defaultValue={minMembers}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minServices">Minimum Services</Label>
              <Input
                id="minServices"
                name="minServices"
                type="number"
                min="0"
                placeholder="e.g., 3"
                defaultValue={minServices}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Apply Filters
            </Button>
            {hasFilters && (
              <Link href="/teams">
                <Button type="button" variant="outline" className="gap-2">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>

        {/* Active Filters Display */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {query && (
              <Badge variant="secondary" size="xs" className="gap-1">
                Search: {query}
              </Badge>
            )}
            {minMembers && (
              <Badge variant="secondary" size="xs" className="gap-1">
                Min Members: {minMembers}
              </Badge>
            )}
            {minServices && (
              <Badge variant="secondary" size="xs" className="gap-1">
                Min Services: {minServices}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
