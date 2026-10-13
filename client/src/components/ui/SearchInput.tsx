import { FC } from 'react';
import { MdSearch } from 'react-icons/md';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput: FC<SearchInputProps> = ({ value, onChange, placeholder = 'Search', className = '' }) => (
  <div className={`relative ${className}`}>
    <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-500 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full h-9 pl-8 pr-3 bg-surface border border-border rounded-md text-sm placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
    />
  </div>
);

export default SearchInput;
