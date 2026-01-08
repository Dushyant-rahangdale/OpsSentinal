'use client';

import Link from 'next/link';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
};

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 7;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (currentPage <= 4) {
      for (let i = 2; i <= 5; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }
  }

  return pages;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const buildUrl = (page: number) => {
    return `${baseUrl}?page=${page}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1.5rem',
        background: 'white',
        borderTop: '1px solid var(--border)',
      }}
    >
      <Link
        href={buildUrl(currentPage - 1)}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--border)',
          borderRadius: '0px',
          textDecoration: 'none',
          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
          background: currentPage === 1 ? '#f3f4f6' : 'white',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          pointerEvents: currentPage === 1 ? 'none' : 'auto',
        }}
      >
        Previous
      </Link>

      {pageNumbers.map((page, idx) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${idx}`} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
              ...
            </span>
          );
        }

        const pageNum = page as number;
        const isActive = pageNum === currentPage;

        return (
          <Link
            key={pageNum}
            href={buildUrl(pageNum)}
            style={{
              padding: '0.5rem 0.875rem',
              border: `1px solid ${isActive ? 'var(--primary-color)' : 'var(--border)'}`,
              borderRadius: '0px',
              textDecoration: 'none',
              color: isActive ? 'white' : 'var(--text-primary)',
              background: isActive ? 'var(--primary-color)' : 'white',
              fontWeight: isActive ? '600' : '400',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--primary-color)';
                e.currentTarget.style.background = '#f8fafc';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            {pageNum}
          </Link>
        );
      })}

      <Link
        href={buildUrl(currentPage + 1)}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--border)',
          borderRadius: '0px',
          textDecoration: 'none',
          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
          background: currentPage === totalPages ? '#f3f4f6' : 'white',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          pointerEvents: currentPage === totalPages ? 'none' : 'auto',
        }}
      >
        Next
      </Link>
    </div>
  );
}
