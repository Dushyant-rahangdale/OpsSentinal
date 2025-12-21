'use client';

import { useState } from 'react';
import { DatePicker, TimePicker, MultiSelect, TagInput, FileUpload, SearchInput, LineChart, AreaChart, Sparkline, ThemeToggle } from '@/components/ui';

export default function TestComponentsPage() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ];

  const chartData = [
    { x: 'Jan', y: 10 },
    { x: 'Feb', y: 20 },
    { x: 'Mar', y: 15 },
    { x: 'Apr', y: 25 },
    { x: 'May', y: 30 },
  ];

  const sparklineData = [10, 20, 15, 25, 30, 20, 35];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Phase 3 Components Test</h1>
        <ThemeToggle showLabel />
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Dark Mode */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>Dark Mode</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Toggle dark mode using the button in the top right.</p>
        </section>

        {/* DatePicker */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>DatePicker</h2>
          <DatePicker
            label="Select Date"
            value={date}
            onChange={setDate}
            fullWidth
          />
          {date && <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Selected: {date}</p>}
        </section>

        {/* TimePicker */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>TimePicker</h2>
          <TimePicker
            label="Select Time"
            value={time}
            onChange={setTime}
            fullWidth
          />
          {time && <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Selected: {time}</p>}
        </section>

        {/* MultiSelect */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>MultiSelect</h2>
          <MultiSelect
            label="Select Options"
            options={options}
            value={selected}
            onChange={setSelected}
            searchable
            fullWidth
          />
          {selected.length > 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Selected: {selected.join(', ')}</p>
          )}
        </section>

        {/* TagInput */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>TagInput</h2>
          <TagInput
            label="Add Tags"
            value={tags}
            onChange={setTags}
            placeholder="Type and press Enter"
            maxTags={5}
            fullWidth
          />
        </section>

        {/* FileUpload */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>FileUpload</h2>
          <FileUpload
            label="Upload Files"
            accept="image/*,.pdf"
            multiple
            maxSize={5}
            onUpload={setFiles}
            fullWidth
          />
        </section>

        {/* SearchInput */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>SearchInput</h2>
          <SearchInput
            label="Search"
            value={search}
            onChange={setSearch}
            onSearch={(value) => console.log('Searching:', value)}
            suggestions={['Suggestion 1', 'Suggestion 2', 'Suggestion 3']}
            recentSearches={['Recent 1', 'Recent 2']}
            fullWidth
          />
        </section>

        {/* LineChart */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>LineChart</h2>
          <LineChart
            data={chartData}
            width={600}
            height={200}
            showGrid
            showPoints
            xAxisLabel="Month"
            yAxisLabel="Value"
          />
        </section>

        {/* AreaChart */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>AreaChart</h2>
          <AreaChart
            data={chartData}
            width={600}
            height={200}
            showGrid
            showPoints
            xAxisLabel="Month"
            yAxisLabel="Value"
          />
        </section>

        {/* Sparkline */}
        <section style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>Sparkline</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Trend:</span>
            <Sparkline data={sparklineData} width={200} height={30} />
            <span style={{ color: 'var(--text-muted)' }}>35</span>
          </div>
        </section>
      </div>
    </div>
  );
}

