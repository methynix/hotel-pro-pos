import { FC } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import Button from './Button';

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  onChange: (page: number) => void;
}

const Pagination: FC<PaginationProps> = ({ page, pages, total, onChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-text-secondary">
        Page {page} of {pages}
        {total !== undefined && <span className="hidden sm:inline"> ({total} total)</span>}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<MdChevronLeft className="w-4 h-4" />}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
          <MdChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
