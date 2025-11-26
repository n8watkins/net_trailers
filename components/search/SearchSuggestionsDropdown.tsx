import React from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { Content, TrendingPerson } from '../../typings'
import { SearchMode } from '../../stores/searchStore'
import SearchResultItem from './SearchResultItem'
import PersonSearchResultItem from './PersonSearchResultItem'

interface SearchSuggestionsDropdownProps {
    isVisible: boolean
    suggestionsRef: React.RefObject<HTMLDivElement | null>
    query: string
    totalResults: number
    filteredCount: number
    hasActiveFilters: boolean
    quickResults: Content[]
    quickPeopleResults?: TrendingPerson[]
    searchMode: SearchMode
    hasMoreResults: boolean
    selectedResultIndex: number
    isSeeAllButtonSelected: boolean
    resultRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    seeAllButtonRef: React.RefObject<HTMLButtonElement | null>
    onQuickResultClick: (item: Content) => void
    onQuickPersonClick?: (person: TrendingPerson) => void
    onSeeAllResults: () => void
    onMouseDown: (e: React.MouseEvent) => void
}

export default function SearchSuggestionsDropdown({
    isVisible,
    suggestionsRef,
    query,
    totalResults,
    filteredCount,
    hasActiveFilters,
    quickResults,
    quickPeopleResults = [],
    searchMode,
    hasMoreResults,
    selectedResultIndex,
    isSeeAllButtonSelected,
    resultRefs,
    seeAllButtonRef,
    onQuickResultClick,
    onQuickPersonClick,
    onSeeAllResults,
    onMouseDown,
}: SearchSuggestionsDropdownProps) {
    // Determine which results to show based on search mode
    const currentResults = searchMode === 'people' ? quickPeopleResults : quickResults
    const currentResultsCount = currentResults.length

    if (!isVisible || currentResultsCount === 0) {
        return null
    }

    return (
        <div
            ref={suggestionsRef}
            onMouseDown={onMouseDown}
            className="absolute z-[110] w-full mt-1 bg-[#0a0a0a] border border-gray-600/50 rounded-lg shadow-lg max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-red-600 hover:scrollbar-thumb-red-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full animate-dropdown-enter"
        >
            {/* Results Count Header */}
            {totalResults > 0 && (
                <div className="px-4 py-2 border-b border-gray-600/50 bg-gradient-to-r from-black to-red-900">
                    <div className="text-xs text-white font-bold">
                        {searchMode === 'people' ? (
                            <>
                                Found {totalResults.toLocaleString()}{' '}
                                {totalResults !== 1 ? 'people' : 'person'} for &ldquo;{query}&rdquo;
                            </>
                        ) : hasActiveFilters ? (
                            <>
                                Showing {filteredCount.toLocaleString()} filtered result
                                {filteredCount !== 1 ? 's' : ''} (of {totalResults.toLocaleString()}{' '}
                                total)
                            </>
                        ) : (
                            <>
                                Found {totalResults.toLocaleString()} result
                                {totalResults !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Results Section */}
            <div className="p-2">
                <div className="space-y-2">
                    {searchMode === 'people'
                        ? /* People Results */
                          quickPeopleResults.map((person: TrendingPerson, index) => (
                              <PersonSearchResultItem
                                  key={`person-${person.id}-${index}`}
                                  person={person}
                                  index={index}
                                  isSelected={selectedResultIndex === index}
                                  onClick={onQuickPersonClick || (() => {})}
                                  onRef={(el) => {
                                      resultRefs.current[index] = el
                                  }}
                              />
                          ))
                        : /* Content Results */
                          quickResults.map((item: Content, index) => (
                              <SearchResultItem
                                  key={`${item.id}-${index}`}
                                  item={item}
                                  index={index}
                                  isSelected={selectedResultIndex === index}
                                  onClick={onQuickResultClick}
                                  onRef={(el) => {
                                      resultRefs.current[index] = el
                                  }}
                              />
                          ))}
                </div>
            </div>

            {/* See All Results Button */}
            {hasMoreResults && (
                <div className="border-t border-gray-600/50 p-2">
                    <button
                        ref={seeAllButtonRef}
                        onClick={onSeeAllResults}
                        className={`w-full flex items-center justify-center rounded-lg p-3 cursor-pointer group border transition-all duration-300 ease-in-out ${
                            isSeeAllButtonSelected
                                ? 'bg-red-600/30 border-red-500/50 shadow-lg shadow-red-500/20'
                                : 'bg-gray-700/30 border-transparent hover:bg-gray-600/30 hover:border-gray-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium group-hover:text-red-400 transition-colors">
                                {searchMode === 'people' ? (
                                    <>
                                        See all {totalResults.toLocaleString()}{' '}
                                        {totalResults !== 1 ? 'people' : 'person'}
                                    </>
                                ) : hasActiveFilters ? (
                                    <>
                                        See all {filteredCount.toLocaleString()} filtered result
                                        {filteredCount !== 1 ? 's' : ''}
                                    </>
                                ) : (
                                    <>See all {totalResults.toLocaleString()} results</>
                                )}
                            </span>
                            <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    )
}
