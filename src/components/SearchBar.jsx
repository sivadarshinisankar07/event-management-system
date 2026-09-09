export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-box">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
