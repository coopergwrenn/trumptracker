import React, { useState } from 'react';
import { Search, Filter, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterToolbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedSource: string;
  setSelectedSource: (source: string) => void;
  sources: string[];
  onClearFilters: () => void;
}

export default function FilterToolbar({
  searchTerm,
  setSearchTerm,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedSource,
  setSelectedSource,
  sources,
  onClearFilters,
}: FilterToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveFilters = searchTerm || startDate || endDate || selectedSource !== 'all';
  const hasAdvancedFilters = startDate || endDate || selectedSource !== 'all';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Search Bar and Expand Button */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search headlines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <Filter className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {hasAdvancedFilters && (
              <span className="ml-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Filter Section */}
      {isExpanded && (
        <>
          {/* Date Range */}
          <div className="p-3 border-b border-gray-200 bg-white">
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Date Range</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Source Filter */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center mb-2">
              <Filter className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">News Source</span>
            </div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="p-3 bg-gray-50">
              <button
                onClick={() => {
                  onClearFilters();
                  setIsExpanded(false);
                }}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}