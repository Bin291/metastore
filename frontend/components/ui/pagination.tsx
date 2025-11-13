"use client";

import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  const startItem = totalItems && itemsPerPage 
    ? (currentPage - 1) * itemsPerPage + 1 
    : null;
  const endItem = totalItems && itemsPerPage
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : null;

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            {startItem && endItem && totalItems ? (
              <>
                Showing <span className="font-medium text-white">{startItem}</span> to{" "}
                <span className="font-medium text-white">{endItem}</span> of{" "}
                <span className="font-medium text-white">{totalItems}</span> results
              </>
            ) : (
              `Page ${currentPage} of ${totalPages}`
            )}
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <Button
              variant="ghost"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-r-none"
            >
              Previous
            </Button>
            {startPage > 1 && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => onPageChange(1)}
                  className="rounded-none"
                >
                  1
                </Button>
                {startPage > 2 && (
                  <span className="px-2 py-2 text-sm text-zinc-400">...</span>
                )}
              </>
            )}
            {pages.map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"}
                onClick={() => onPageChange(page)}
                className="rounded-none"
              >
                {page}
              </Button>
            ))}
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span className="px-2 py-2 text-sm text-zinc-400">...</span>
                )}
                <Button
                  variant="ghost"
                  onClick={() => onPageChange(totalPages)}
                  className="rounded-none"
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-l-none"
            >
              Next
            </Button>
          </nav>
        </div>
      </div>
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

