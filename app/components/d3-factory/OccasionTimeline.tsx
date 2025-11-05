import {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';

export interface Occasion {
  id: string;
  title: string;
  date: Date;
  type: 'birthday' | 'anniversary' | 'achievement' | 'self-love' | 'surprise' | 'other';
  description?: string;
  giftId?: string;
  dressId?: string;
  photos?: string[];
  mood?: 'excited' | 'romantic' | 'grateful' | 'proud' | 'joyful';
  recipient?: string;
}

export interface Gift {
  id: string;
  name: string;
  imageUrl?: string;
  deliveryDate: Date;
  message?: string;
  occasionId: string;
}

interface OccasionTimelineProps {
  occasions: Occasion[];
  gifts?: Gift[];
  onOccasionClick?: (occasion: Occasion) => void;
  onGiftClick?: (gift: Gift) => void;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  showFuture?: boolean;
}

export function OccasionTimeline({
  occasions,
  gifts = [],
  onOccasionClick,
  onGiftClick,
  width = 1200,
  height = 600,
  theme = 'dark',
  showFuture = true,
}: OccasionTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || occasions.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = {top: 80, right: 40, bottom: 60, left: 40};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const colors =
      theme === 'dark'
        ? {
            background: '#0a0a0a',
            timeline: '#374151',
            birthday: '#ec4899',
            anniversary: '#f43f5e',
            achievement: '#8b5cf6',
            'self-love': '#06b6d4',
            surprise: '#f59e0b',
            other: '#6b7280',
            text: '#ffffff',
            textSecondary: '#9ca3af',
            highlight: '#fbbf24',
            past: '#4b5563',
            future: '#3b82f6',
            today: '#10b981',
          }
        : {
            background: '#ffffff',
            timeline: '#d1d5db',
            birthday: '#db2777',
            anniversary: '#e11d48',
            achievement: '#7c3aed',
            'self-love': '#0891b2',
            surprise: '#d97706',
            other: '#4b5563',
            text: '#000000',
            textSecondary: '#6b7280',
            highlight: '#f59e0b',
            past: '#9ca3af',
            future: '#2563eb',
            today: '#059669',
          };

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', colors.background);

    const container = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const now = new Date();
    const filteredOccasions = showFuture
      ? occasions
      : occasions.filter((d) => d.date <= now);

    const sortedOccasions = [...filteredOccasions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    if (sortedOccasions.length === 0) return;

    const xScale = d3
      .scaleTime()
      .domain([
        d3.min(sortedOccasions, (d) => d.date) || now,
        d3.max(sortedOccasions, (d) => d.date) || now,
      ])
      .range([0, innerWidth])
      .nice();

    const timeAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d3.timeFormat('%b %Y') as any);

    container
      .append('g')
      .attr('transform', `translate(0,${innerHeight / 2})`)
      .call(timeAxis)
      .style('color', colors.textSecondary)
      .style('font-size', '12px')
      .selectAll('line')
      .style('stroke', colors.timeline);

    container
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', innerHeight / 2)
      .attr('y2', innerHeight / 2)
      .attr('stroke', colors.timeline)
      .attr('stroke-width', 3)
      .style('stroke-linecap', 'round');

    const todayX = xScale(now);
    if (todayX >= 0 && todayX <= innerWidth) {
      const todayGroup = container.append('g').attr('transform', `translate(${todayX},0)`);

      todayGroup
        .append('line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', colors.today)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);

      todayGroup
        .append('text')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.today)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('TODAY');
    }

    const occasionGroups = container
      .selectAll('.occasion')
      .data(sortedOccasions)
      .join('g')
      .attr('class', 'occasion')
      .attr('transform', (d, i) => {
        const x = xScale(d.date);
        const y = i % 2 === 0 ? innerHeight / 2 - 120 : innerHeight / 2 + 80;
        return `translate(${x},${y})`;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => setHoveredItem(d.id))
      .on('mouseleave', () => setHoveredItem(null))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedOccasion(d.id);
        onOccasionClick?.(d);
      });

    occasionGroups.each(function (d, i) {
      const group = d3.select(this);
      const y = i % 2 === 0 ? 60 : -40;

      group
        .append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', 0)
        .attr('y2', 0)
        .attr('stroke', (colors as any)[d.type] || colors.other)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.6);
    });

    const cardWidth = 140;
    const cardHeight = 100;

    const cards = occasionGroups.append('g').attr('class', 'occasion-card');

    cards
      .append('rect')
      .attr('x', -cardWidth / 2)
      .attr('y', -cardHeight / 2)
      .attr('width', cardWidth)
      .attr('height', cardHeight)
      .attr('rx', 12)
      .attr('fill', (d) => (colors as any)[d.type])
      .attr('fill-opacity', 0.8)
      .attr('stroke', (d) => (selectedOccasion === d.id ? colors.highlight : 'none'))
      .attr('stroke-width', 3)
      .style(
        'filter',
        (d) =>
          hoveredItem === d.id
            ? 'drop-shadow(0 10px 25px rgba(0,0,0,0.5))'
            : 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
      );

    const icons: Record<string, string> = {
      birthday: '🎂',
      anniversary: '💕',
      achievement: '🏆',
      'self-love': '💝',
      surprise: '🎁',
      other: '✨',
    };

    cards
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -25)
      .attr('font-size', '32px')
      .text((d) => icons[d.type] || icons.other);

    cards
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .attr('fill', colors.text)
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
      .text((d) => (d.title.length > 16 ? d.title.substring(0, 16) + '...' : d.title));

    cards
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 28)
      .attr('fill', colors.textSecondary)
      .attr('font-size', '11px')
      .text((d) => d3.timeFormat('%b %d, %Y')(d.date));

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .text('Your Special Moments Timeline');

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.textSecondary)
      .attr('font-size', '14px')
      .text('Every dress tells a story, every gift creates a memory');
  }, [
    occasions,
    gifts,
    selectedOccasion,
    hoveredItem,
    width,
    height,
    theme,
    showFuture,
    onOccasionClick,
    onGiftClick,
  ]);

  return (
    <div className="occasion-timeline-container">
      <svg ref={svgRef} style={{display: 'block', margin: 'auto'}} />
    </div>
  );
}
