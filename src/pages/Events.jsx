import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../context/EventContext.jsx';
import EventCard from '../components/EventCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { getDisplayStatus } from '../services/eventService.js';
import { CATEGORIES, PAYMENT_MODES } from '../data/initialData.js';

export default function Events() {
  const { events, loading } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [payment, setPayment] = useState('');
  const [sortBy, setSortBy] = useState('date-asc');

  function handleCategoryChange(value) {
    setCategory(value);
    setSearchParams(value ? { category: value } : {});
  }

  const filteredEvents = useMemo(() => {
    let result = events.filter((e) => getDisplayStatus(e) === 'Published' || getDisplayStatus(e) === 'Full');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)
      );
    }
    if (category) result = result.filter((e) => e.category === category);
    if (payment) result = result.filter((e) => e.paymentMode === payment);

    result = [...result].sort((a, b) => {
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

    return result;
  }, [events, search, category, payment, sortBy]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Browse Events</h1>
            <p className="subtitle">Find fests, workshops, competitions and more happening on campus.</p>
          </div>
        </div>

        <div className="filter-bar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search events by name, venue..." />
          <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">All Payment Types</option>
            {PAYMENT_MODES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date-asc">Date: Earliest First</option>
            <option value="date-desc">Date: Latest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading events..." />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No events match your search"
            message="Try adjusting your filters or search terms."
          />
        ) : (
          <div className="grid grid-4">
            {filteredEvents.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
