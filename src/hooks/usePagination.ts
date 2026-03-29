import { useState, useEffect, useRef } from "react";

export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when the total item count changes (new search or filter applied)
  const itemCountRef = useRef(items.length);
  useEffect(() => {
    if (itemCountRef.current !== items.length) {
      itemCountRef.current = items.length;
      setCurrentPage(1);
    }
  });

  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    totalCount: items.length,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setCurrentPage(p => Math.max(p - 1, 1)),
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
  };
}
