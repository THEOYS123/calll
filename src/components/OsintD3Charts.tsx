import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Search,
  Sparkles,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { OsintSearchHistoryItem } from '../types';

interface OsintD3ChartsProps {
  searchHistories: OsintSearchHistoryItem[];
  onSelectKeyword?: (keyword: string) => void;
  selectedKeyword?: string;
}

interface DailyVolumeData {
  date: string;
  displayDate: string;
  count: number;
  totalMatches: number;
}

interface KeywordFreqData {
  keyword: string;
  count: number;
  totalMatches: number;
  percentage: number;
}

export function OsintD3Charts({
  searchHistories,
  onSelectKeyword,
  selectedKeyword
}: OsintD3ChartsProps) {
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'timeline' | 'keywords'>('all');
  const [hoveredDate, setHoveredDate] = useState<DailyVolumeData | null>(null);
  const [hoveredKeyword, setHoveredKeyword] = useState<KeywordFreqData | null>(null);

  const timelineSvgRef = useRef<SVGSVGElement | null>(null);
  const keywordSvgRef = useRef<SVGSVGElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const keywordContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Process Daily Volume Data
  const dailyData: DailyVolumeData[] = useMemo(() => {
    if (!searchHistories || searchHistories.length === 0) return [];

    const map = new Map<string, { count: number; totalMatches: number; rawDate: Date }>();

    searchHistories.forEach((item) => {
      const d = new Date(item.timestamp);
      // Format YYYY-MM-DD
      const dateKey = !isNaN(d.getTime())
        ? d.toISOString().split('T')[0]
        : 'Unknown';

      const existing = map.get(dateKey) || { count: 0, totalMatches: 0, rawDate: d };
      existing.count += 1;
      existing.totalMatches += item.totalMatches || 0;
      map.set(dateKey, existing);
    });

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map((key) => {
      const entry = map.get(key)!;
      let displayDate = key;
      if (key !== 'Unknown') {
        const parts = key.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          displayDate = d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short'
          });
        }
      }
      return {
        date: key,
        displayDate,
        count: entry.count,
        totalMatches: entry.totalMatches
      };
    });
  }, [searchHistories]);

  // 2. Process Keyword Frequency Data
  const keywordData: KeywordFreqData[] = useMemo(() => {
    if (!searchHistories || searchHistories.length === 0) return [];

    const map = new Map<string, { count: number; totalMatches: number }>();
    const total = searchHistories.length;

    searchHistories.forEach((item) => {
      const kw = (item.target || '').trim();
      if (!kw) return;
      const lower = kw.toLowerCase();
      const existing = map.get(lower) || { count: 0, totalMatches: 0 };
      existing.count += 1;
      existing.totalMatches += item.totalMatches || 0;
      map.set(lower, existing);
    });

    const list = Array.from(map.entries()).map(([keyword, val]) => ({
      keyword,
      count: val.count,
      totalMatches: val.totalMatches,
      percentage: total > 0 ? (val.count / total) * 100 : 0
    }));

    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 10); // Top 10 frequent keywords
  }, [searchHistories]);

  // Summary Metrics
  const peakDay = useMemo(() => {
    if (dailyData.length === 0) return null;
    return dailyData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), dailyData[0]);
  }, [dailyData]);

  const topKeyword = useMemo(() => {
    return keywordData.length > 0 ? keywordData[0] : null;
  }, [keywordData]);

  const avgDailyCount = useMemo(() => {
    if (dailyData.length === 0) return 0;
    const sum = dailyData.reduce((acc, curr) => acc + curr.count, 0);
    return (sum / dailyData.length).toFixed(1);
  }, [dailyData]);

  // -------------------------------------------------------------
  // Render D3 Daily Timeline Chart
  // -------------------------------------------------------------
  useEffect(() => {
    if (!timelineSvgRef.current || dailyData.length === 0) return;

    const svg = d3.select(timelineSvgRef.current);
    svg.selectAll('*').remove();

    const width = timelineContainerRef.current?.clientWidth || 500;
    const height = 220;
    const margin = { top: 20, right: 25, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Defs for gradients and glow
    const defs = svg.append('defs');

    // Area Gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'dailyAreaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.45);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.02);

    // Bar Gradient
    const barGradient = defs
      .append('linearGradient')
      .attr('id', 'dailyBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    barGradient.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8');
    barGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0284c7');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (band)
    const xScale = d3
      .scaleBand()
      .domain(dailyData.map((d) => d.date))
      .range([0, innerWidth])
      .padding(0.35);

    // Y Scale (linear)
    const maxVal = d3.max(dailyData, (d) => d.count) || 5;
    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(maxVal * 1.25, 4)])
      .range([innerHeight, 0])
      .nice();

    // Horizontal Grid Lines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(4);

    g.append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-opacity', 0.5);
    g.select('.grid .domain').remove();

    // Area Generator
    const area = d3
      .area<DailyVolumeData>()
      .x((d) => (xScale(d.date) || 0) + xScale.bandwidth() / 2)
      .y0(innerHeight)
      .y1((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Line Generator
    const line = d3
      .line<DailyVolumeData>()
      .x((d) => (xScale(d.date) || 0) + xScale.bandwidth() / 2)
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Draw Smooth Area
    g.append('path')
      .datum(dailyData)
      .attr('fill', 'url(#dailyAreaGradient)')
      .attr('d', area);

    // Draw Smooth Curve Line
    g.append('path')
      .datum(dailyData)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Draw Interactive Bars
    g.selectAll('.bar')
      .data(dailyData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.date) || 0)
      .attr('y', (d) => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.count))
      .attr('rx', 4)
      .attr('fill', 'url(#dailyBarGradient)')
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#38bdf8').attr('stroke-width', 1.5);
        setHoveredDate(d);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        setHoveredDate(null);
      });

    // Draw Peak Value Circles on points
    g.selectAll('.point')
      .data(dailyData)
      .enter()
      .append('circle')
      .attr('cx', (d) => (xScale(d.date) || 0) + xScale.bandwidth() / 2)
      .attr('cy', (d) => yScale(d.count))
      .attr('r', 4)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2);

    // Value Labels on top of bars
    g.selectAll('.val-label')
      .data(dailyData)
      .enter()
      .append('text')
      .attr('x', (d) => (xScale(d.date) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text((d) => d.count);

    // X Axis
    const xAxis = d3.axisBottom(xScale).tickFormat((d) => {
      const match = dailyData.find((item) => item.date === d);
      return match ? match.displayDate : d;
    });

    const gx = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.select('.domain').attr('stroke', '#334155');
    gx.selectAll('line').attr('stroke', '#334155');
    gx.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('dy', '1em');

    // Y Axis
    const yAxis = d3.axisLeft(yScale).ticks(4).tickFormat(d3.format('d'));
    const gy = g.append('g').call(yAxis);
    gy.select('.domain').remove();
    gy.selectAll('line').remove();
    gy.selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');
  }, [dailyData]);

  // -------------------------------------------------------------
  // Render D3 Top Keywords Horizontal Bar Chart
  // -------------------------------------------------------------
  useEffect(() => {
    if (!keywordSvgRef.current || keywordData.length === 0) return;

    const svg = d3.select(keywordSvgRef.current);
    svg.selectAll('*').remove();

    const width = keywordContainerRef.current?.clientWidth || 500;
    const barHeight = 28;
    const margin = { top: 15, right: 60, bottom: 25, left: 110 };
    const innerWidth = Math.max(width - margin.left - margin.right, 100);
    const height = keywordData.length * (barHeight + 10) + margin.top + margin.bottom;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const defs = svg.append('defs');

    // Gradient for keyword bars
    const kwGradient = defs
      .append('linearGradient')
      .attr('id', 'kwBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    kwGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0ea5e9');
    kwGradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Y scale (band for keywords)
    const yScale = d3
      .scaleBand()
      .domain(keywordData.map((d) => d.keyword))
      .range([0, innerHeight])
      .padding(0.28);

    // X scale (linear for count)
    const maxCount = d3.max(keywordData, (d) => d.count) || 1;
    const xScale = d3
      .scaleLinear()
      .domain([0, maxCount * 1.15])
      .range([0, innerWidth])
      .nice();

    // Background track bars
    g.selectAll('.track')
      .data(keywordData)
      .enter()
      .append('rect')
      .attr('class', 'track')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.keyword) || 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('rx', 5)
      .attr('fill', '#1e293b')
      .attr('opacity', 0.5);

    // Active bars
    g.selectAll('.bar')
      .data(keywordData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.keyword) || 0)
      .attr('width', (d) => Math.max(xScale(d.count), 4))
      .attr('height', yScale.bandwidth())
      .attr('rx', 5)
      .attr('fill', (d) => (selectedKeyword && d.keyword === selectedKeyword.toLowerCase() ? '#f59e0b' : 'url(#kwBarGradient)'))
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('filter', 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))');
        setHoveredKeyword(d);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).attr('opacity', 0.9).attr('filter', 'none');
        setHoveredKeyword(null);
      })
      .on('click', (event, d) => {
        if (onSelectKeyword) {
          onSelectKeyword(d.keyword);
        }
      });

    // Count text badge on right of each bar
    g.selectAll('.count-label')
      .data(keywordData)
      .enter()
      .append('text')
      .attr('x', (d) => xScale(d.count) + 8)
      .attr('y', (d) => (yScale(d.keyword) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('fill', '#f1f5f9')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text((d) => `${d.count}x (${d.percentage.toFixed(0)}%)`);

    // Y Axis (Keyword labels with truncation & rank)
    const yAxis = d3.axisLeft(yScale).tickFormat((kw, index) => {
      const rank = index + 1;
      const str = String(kw);
      const truncated = str.length > 13 ? str.substring(0, 11) + '..' : str;
      return `#${rank} ${truncated}`;
    });

    const gy = g.append('g').call(yAxis);
    gy.select('.domain').remove();
    gy.selectAll('line').remove();
    gy.selectAll('text')
      .attr('fill', (d) => (selectedKeyword && String(d) === selectedKeyword.toLowerCase() ? '#fbbf24' : '#cbd5e1'))
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onSelectKeyword) {
          onSelectKeyword(String(d));
        }
      });
  }, [keywordData, selectedKeyword, onSelectKeyword]);

  // Handle Resize for responsive SVGs
  useEffect(() => {
    const handleResize = () => {
      // Force trigger state-independent re-render of SVGs
      if (timelineSvgRef.current && dailyData.length > 0) {
        // Redraw
        const evt = new Event('resize');
        window.dispatchEvent(evt);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dailyData]);

  if (searchHistories.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-200">Belum Ada Riwayat untuk Visualisasi D3</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Lakukan pencarian target NIK, nama, atau nomor HP di bot Telegram untuk memunculkan grafik visualisasi data otomatis berdasarkan volume harian dan kata kunci terpopuler.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shadow-inner">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Visualisasi D3.js: Analitik & Volume Pencarian
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Interactive D3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Grafik interaktif volume harian & frekuensi kata kunci yang sering dicari. Klik pada kata kunci untuk filter langsung.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveChartTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeChartTab === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Visualisasi</span>
          </button>

          <button
            onClick={() => setActiveChartTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeChartTab === 'timeline'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Volume Harian</span>
          </button>

          <button
            onClick={() => setActiveChartTab('keywords')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeChartTab === 'keywords'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Kata Kunci Populer</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>Hari Tersibuk (Peak)</span>
          </div>
          <div className="text-sm font-bold text-cyan-300 mt-1">
            {peakDay ? `${peakDay.displayDate} (${peakDay.count}x)` : '-'}
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Search className="w-3 h-3 text-emerald-400" />
            <span>Target #1 Paling Dicari</span>
          </div>
          <div className="text-sm font-bold text-emerald-300 mt-1 truncate" title={topKeyword?.keyword}>
            {topKeyword ? `${topKeyword.keyword} (${topKeyword.count}x)` : '-'}
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" />
            <span>Rata-Rata / Hari Aktif</span>
          </div>
          <div className="text-sm font-bold text-amber-300 mt-1">
            {avgDailyCount} pencarian / hari
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Variasi Kata Kunci</span>
          </div>
          <div className="text-sm font-bold text-purple-300 mt-1">
            {keywordData.length} target unik
          </div>
        </div>
      </div>

      {/* Selected keyword active filter pill indicator */}
      {selectedKeyword && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Memfilter riwayat tabel untuk kata kunci:{' '}
              <span className="font-bold font-mono text-amber-300">"{selectedKeyword}"</span>
            </span>
          </div>
          <button
            onClick={() => onSelectKeyword && onSelectKeyword('')}
            className="text-[11px] underline hover:text-white"
          >
            Hapus Filter
          </button>
        </div>
      )}

      {/* Charts Grid */}
      <div className={`grid gap-5 ${activeChartTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* CHART 1: Volume Pencarian Harian (Timeline D3) */}
        {(activeChartTab === 'all' || activeChartTab === 'timeline') && (
          <div
            ref={timelineContainerRef}
            className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-200">
                  📈 Volume Pencarian Harian (Daily Volume)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {dailyData.length} hari terekam
              </span>
            </div>

            {/* Hover Tooltip display */}
            <div className="min-h-6 flex items-center justify-between text-[11px] font-mono px-1">
              {hoveredDate ? (
                <span className="text-cyan-300">
                  📅 <span className="font-bold">{hoveredDate.date}</span>: {hoveredDate.count} pencarian ({hoveredDate.totalMatches} data ditemukan)
                </span>
              ) : (
                <span className="text-slate-500 italic">
                  Arahkan kursor pada batang grafik untuk rincian tanggal & jumlah record
                </span>
              )}
            </div>

            {/* D3 SVG Container */}
            <div className="w-full overflow-hidden select-none">
              <svg ref={timelineSvgRef} className="w-full overflow-visible" />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
              <span>Kurva Monotone X + Histogram Frekuensi</span>
              <span>Satuan: Query Pencarian</span>
            </div>
          </div>
        )}

        {/* CHART 2: Frekuensi Kata Kunci yang Sering Dicari (D3 Horizontal Bar Chart) */}
        {(activeChartTab === 'all' || activeChartTab === 'keywords') && (
          <div
            ref={keywordContainerRef}
            className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  📊 Frekuensi Kata Kunci Terpopuler (Top Keywords)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Top {keywordData.length} query
              </span>
            </div>

            {/* Hover Tooltip display */}
            <div className="min-h-6 flex items-center justify-between text-[11px] font-mono px-1">
              {hoveredKeyword ? (
                <span className="text-emerald-300">
                  🎯 Target: <span className="font-bold font-mono">"{hoveredKeyword.keyword}"</span> • {hoveredKeyword.count}x dicari ({hoveredKeyword.totalMatches} match intel)
                </span>
              ) : (
                <span className="text-slate-500 italic">
                  Klik batang kata kunci untuk menyaring riwayat pencarian di bawah
                </span>
              )}
            </div>

            {/* D3 SVG Container */}
            <div className="w-full overflow-hidden select-none">
              <svg ref={keywordSvgRef} className="w-full overflow-visible" />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
              <span>Klik label atau batang untuk filter instan</span>
              <span>Skala Relatif (%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
