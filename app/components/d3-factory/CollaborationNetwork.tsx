import {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'designer' | 'contributor' | 'viewer';
  activeDesigns: number;
}

export interface CollaborationLink {
  source: string;
  target: string;
  strength: number;
  designId?: string;
}

interface CollaborationNetworkProps {
  teamMembers: TeamMember[];
  links: CollaborationLink[];
  onNodeClick?: (member: TeamMember) => void;
  onLinkClick?: (link: CollaborationLink) => void;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

export function CollaborationNetwork({
  teamMembers,
  links,
  onNodeClick,
  onLinkClick,
  width = 800,
  height = 600,
  theme = 'dark',
}: CollaborationNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || teamMembers.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const colors =
      theme === 'dark'
        ? {
            background: '#0a0a0a',
            designer: '#8b5cf6',
            contributor: '#3b82f6',
            viewer: '#6b7280',
            link: '#374151',
            linkActive: '#8b5cf6',
            text: '#ffffff',
            highlight: '#f59e0b',
          }
        : {
            background: '#ffffff',
            designer: '#7c3aed',
            contributor: '#2563eb',
            viewer: '#4b5563',
            link: '#d1d5db',
            linkActive: '#7c3aed',
            text: '#000000',
            highlight: '#f59e0b',
          };

    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', colors.background);

    const simulation = d3
      .forceSimulation(teamMembers as any)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => 150 - d.strength * 10),
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    const container = svg.append('g');

    const zoom = d3.zoom().scaleExtent([0.5, 3]).on('zoom', (event) => {
      container.attr('transform', event.transform);
    });

    svg.call(zoom as any);

    const link = container
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr(
        'stroke',
        (d: any) =>
          selectedNode && (d.source === selectedNode || d.target === selectedNode)
            ? colors.linkActive
            : colors.link,
      )
      .attr('stroke-width', (d: any) => d.strength * 0.5)
      .attr('stroke-opacity', (d: any) => 0.3 + d.strength * 0.05)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onLinkClick?.(d);
      });

    const node = container
      .append('g')
      .selectAll('g')
      .data(teamMembers)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, TeamMember>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any,
      );

    node
      .append('circle')
      .attr('r', (d) => 20 + d.activeDesigns * 2)
      .attr('fill', (d) => {
        switch (d.role) {
          case 'designer':
            return colors.designer;
          case 'contributor':
            return colors.contributor;
          case 'viewer':
            return colors.viewer;
          default:
            return colors.viewer;
        }
      })
      .attr('stroke', (d) => (selectedNode === d.id ? colors.highlight : '#ffffff'))
      .attr('stroke-width', (d) => (selectedNode === d.id ? 4 : 2))
      .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.id);
        onNodeClick?.(d);
      });

    node
      .append('text')
      .text((d) => d.name)
      .attr('y', (d) => 30 + d.activeDesigns * 2)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)');

    node
      .filter((d) => d.activeDesigns > 0)
      .append('text')
      .text((d) => d.activeDesigns)
      .attr('y', (d) => 45 + d.activeDesigns * 2)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.highlight)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [teamMembers, links, selectedNode, width, height, theme, onNodeClick, onLinkClick]);

  return (
    <div className="collaboration-network-container">
      <svg ref={svgRef} style={{display: 'block', margin: 'auto'}} />
    </div>
  );
}
