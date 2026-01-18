/**
 * Knowledge Graph
 *
 * Graph-based knowledge representation for delivery operations
 * Phase 7: Intelligence & Knowledge Graph
 *
 * Features:
 * - Entity relationship mapping
 * - Historical pattern storage
 * - Contextual recommendations
 * - Inference engine
 * - Query optimization
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Node types in the knowledge graph
 */
export type NodeType =
  | 'vehicle'
  | 'driver'
  | 'facility'
  | 'warehouse'
  | 'zone'
  | 'batch'
  | 'route'
  | 'pattern'
  | 'anomaly'
  | 'recommendation';

/**
 * Relationship types between nodes
 */
export type RelationType =
  | 'assigned_to' // driver assigned_to vehicle
  | 'delivers_to' // vehicle delivers_to facility
  | 'located_in' // facility located_in zone
  | 'departs_from' // route departs_from warehouse
  | 'contains' // batch contains deliveries
  | 'follows' // route follows pattern
  | 'causes' // pattern causes anomaly
  | 'recommends' // pattern recommends action
  | 'affects' // anomaly affects entity
  | 'similar_to'; // entity similar_to entity

/**
 * Knowledge graph node
 */
export interface KnowledgeNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
  timestamp: Date;
  confidence?: number; // 0-100 for inferred nodes
}

/**
 * Knowledge graph relationship
 */
export interface KnowledgeRelationship {
  id: string;
  type: RelationType;
  fromNodeId: string;
  toNodeId: string;
  weight: number; // 0-1, strength of relationship
  properties?: Record<string, any>;
  timestamp: Date;
  confidence?: number; // 0-100 for inferred relationships
}

/**
 * Query result from knowledge graph
 */
export interface KnowledgeQueryResult {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  inference?: {
    confidence: number;
    reasoning: string;
  };
}

/**
 * Path in the knowledge graph
 */
export interface KnowledgePath {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  length: number;
  totalWeight: number;
}

/**
 * Knowledge Graph
 *
 * Manages graph-based knowledge representation and querying
 */
export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: Map<string, KnowledgeRelationship> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map(); // nodeId -> connected nodeIds
  private reverseAdjacencyList: Map<string, Set<string>> = new Map(); // for reverse traversal

  /**
   * Add node to graph
   */
  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);

    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }

    if (!this.reverseAdjacencyList.has(node.id)) {
      this.reverseAdjacencyList.set(node.id, new Set());
    }
  }

  /**
   * Add relationship to graph
   */
  addRelationship(relationship: KnowledgeRelationship): void {
    this.relationships.set(relationship.id, relationship);

    // Update adjacency lists
    const fromConnections = this.adjacencyList.get(relationship.fromNodeId) || new Set();
    fromConnections.add(relationship.toNodeId);
    this.adjacencyList.set(relationship.fromNodeId, fromConnections);

    const toReverseConnections = this.reverseAdjacencyList.get(relationship.toNodeId) || new Set();
    toReverseConnections.add(relationship.fromNodeId);
    this.reverseAdjacencyList.set(relationship.toNodeId, toReverseConnections);
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get relationships for a node
   */
  getRelationships(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): KnowledgeRelationship[] {
    const relationships: KnowledgeRelationship[] = [];

    if (direction === 'outgoing' || direction === 'both') {
      Array.from(this.relationships.values()).forEach((rel) => {
        if (rel.fromNodeId === nodeId) {
          relationships.push(rel);
        }
      });
    }

    if (direction === 'incoming' || direction === 'both') {
      Array.from(this.relationships.values()).forEach((rel) => {
        if (rel.toNodeId === nodeId) {
          relationships.push(rel);
        }
      });
    }

    return relationships;
  }

  /**
   * Find nodes by type
   */
  findNodesByType(type: NodeType): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter((node) => node.type === type);
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(fromNodeId: string, toNodeId: string): KnowledgePath | null {
    const queue: Array<{ nodeId: string; path: string[]; weight: number }> = [
      { nodeId: fromNodeId, path: [fromNodeId], weight: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === toNodeId) {
        // Found path - construct result
        return this.constructPath(current.path);
      }

      if (visited.has(current.nodeId)) {
        continue;
      }

      visited.add(current.nodeId);

      // Add neighbors to queue
      const neighbors = this.adjacencyList.get(current.nodeId) || new Set();
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          const relationship = Array.from(this.relationships.values()).find(
            (rel) => rel.fromNodeId === current.nodeId && rel.toNodeId === neighborId
          );

          queue.push({
            nodeId: neighborId,
            path: [...current.path, neighborId],
            weight: current.weight + (relationship?.weight || 0),
          });
        }
      });
    }

    return null; // No path found
  }

  /**
   * Find all paths within max depth
   */
  findPathsWithinDepth(fromNodeId: string, maxDepth: number): KnowledgePath[] {
    const paths: KnowledgePath[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, path: string[], depth: number, weight: number) => {
      if (depth > maxDepth) return;

      visited.add(nodeId);

      if (path.length > 1) {
        paths.push(this.constructPath(path)!);
      }

      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          const relationship = Array.from(this.relationships.values()).find(
            (rel) => rel.fromNodeId === nodeId && rel.toNodeId === neighborId
          );

          dfs(
            neighborId,
            [...path, neighborId],
            depth + 1,
            weight + (relationship?.weight || 0)
          );
        }
      });

      visited.delete(nodeId);
    };

    dfs(fromNodeId, [fromNodeId], 0, 0);

    return paths;
  }

  /**
   * Query graph by relationship type
   */
  queryByRelationship(
    fromNodeType: NodeType,
    relationshipType: RelationType,
    toNodeType?: NodeType
  ): KnowledgeQueryResult {
    const matchingRelationships: KnowledgeRelationship[] = [];
    const matchingNodes: KnowledgeNode[] = [];
    const nodeIds = new Set<string>();

    Array.from(this.relationships.values()).forEach((rel) => {
      if (rel.type === relationshipType) {
        const fromNode = this.nodes.get(rel.fromNodeId);
        const toNode = this.nodes.get(rel.toNodeId);

        if (fromNode?.type === fromNodeType && (!toNodeType || toNode?.type === toNodeType)) {
          matchingRelationships.push(rel);

          if (fromNode && !nodeIds.has(fromNode.id)) {
            matchingNodes.push(fromNode);
            nodeIds.add(fromNode.id);
          }

          if (toNode && !nodeIds.has(toNode.id)) {
            matchingNodes.push(toNode);
            nodeIds.add(toNode.id);
          }
        }
      }
    });

    return {
      nodes: matchingNodes,
      relationships: matchingRelationships,
    };
  }

  /**
   * Infer new relationships based on existing patterns
   */
  inferRelationships(): KnowledgeRelationship[] {
    const inferred: KnowledgeRelationship[] = [];

    // Example inference: If A delivers_to B and B located_in C, infer A operates_in C
    Array.from(this.relationships.values()).forEach((rel1) => {
      if (rel1.type === 'delivers_to') {
        const toNodeRels = this.getRelationships(rel1.toNodeId, 'outgoing');
        toNodeRels.forEach((rel2) => {
          if (rel2.type === 'located_in') {
            // Infer vehicle operates in zone
            const inferredId = `inferred_${rel1.fromNodeId}_${rel2.toNodeId}`;

            if (!this.relationships.has(inferredId)) {
              const inferredRel: KnowledgeRelationship = {
                id: inferredId,
                type: 'affects', // Generic relationship type
                fromNodeId: rel1.fromNodeId,
                toNodeId: rel2.toNodeId,
                weight: rel1.weight * rel2.weight, // Combined weight
                timestamp: new Date(),
                confidence: Math.min(rel1.weight * 100, 80), // Cap at 80% confidence
                properties: {
                  inferred: true,
                  via: [rel1.id, rel2.id],
                },
              };

              inferred.push(inferredRel);
              this.addRelationship(inferredRel);
            }
          }
        });
      }
    });

    console.log(`[KnowledgeGraph] Inferred ${inferred.length} new relationships`);
    return inferred;
  }

  /**
   * Find similar entities using graph structure
   */
  findSimilarEntities(nodeId: string, minSimilarity: number = 0.5): KnowledgeNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const nodeRelationships = this.getRelationships(nodeId);
    const similarities = new Map<string, number>();

    // Find nodes with similar relationships
    Array.from(this.nodes.values()).forEach((otherNode) => {
      if (otherNode.id === nodeId || otherNode.type !== node.type) return;

      const otherRelationships = this.getRelationships(otherNode.id);

      // Calculate Jaccard similarity of relationship types
      const thisTypes = new Set(nodeRelationships.map((r) => r.type));
      const otherTypes = new Set(otherRelationships.map((r) => r.type));

      const intersection = new Set([...thisTypes].filter((x) => otherTypes.has(x)));
      const union = new Set([...thisTypes, ...otherTypes]);

      const similarity = intersection.size / union.size;

      if (similarity >= minSimilarity) {
        similarities.set(otherNode.id, similarity);
      }
    });

    // Return top similar nodes
    return Array.from(similarities.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get contextual recommendations for a node
   */
  getRecommendations(nodeId: string): KnowledgeNode[] {
    const recommendations: KnowledgeNode[] = [];

    // Find recommendation nodes connected to this entity
    const relationships = this.getRelationships(nodeId, 'incoming');
    relationships.forEach((rel) => {
      if (rel.type === 'recommends') {
        const recommendationNode = this.nodes.get(rel.fromNodeId);
        if (recommendationNode?.type === 'recommendation') {
          recommendations.push(recommendationNode);
        }
      }
    });

    // Sort by weight and confidence
    return recommendations.sort((a, b) => {
      const relA = relationships.find((r) => r.fromNodeId === a.id);
      const relB = relationships.find((r) => r.fromNodeId === b.id);
      return (relB?.weight || 0) - (relA?.weight || 0);
    });
  }

  /**
   * Load knowledge graph from database
   */
  async loadFromDatabase(): Promise<void> {
    try {
      console.log('[KnowledgeGraph] Loading from database...');

      // Load nodes
      const { data: nodeData, error: nodeError } = await supabase
        .from('knowledge_graph_nodes')
        .select('*');

      if (nodeError) throw nodeError;

      nodeData?.forEach((row: any) => {
        this.addNode({
          id: row.id,
          type: row.type as NodeType,
          label: row.label,
          properties: row.properties || {},
          timestamp: new Date(row.created_at),
          confidence: row.confidence,
        });
      });

      // Load relationships
      const { data: relData, error: relError } = await supabase
        .from('knowledge_graph_relationships')
        .select('*');

      if (relError) throw relError;

      relData?.forEach((row: any) => {
        this.addRelationship({
          id: row.id,
          type: row.type as RelationType,
          fromNodeId: row.from_node_id,
          toNodeId: row.to_node_id,
          weight: row.weight,
          properties: row.properties,
          timestamp: new Date(row.created_at),
          confidence: row.confidence,
        });
      });

      console.log(
        `[KnowledgeGraph] Loaded ${this.nodes.size} nodes and ${this.relationships.size} relationships`
      );
    } catch (err) {
      console.error('[KnowledgeGraph] Error loading from database:', err);
    }
  }

  /**
   * Save knowledge graph to database
   */
  async saveToDatabase(): Promise<void> {
    try {
      console.log('[KnowledgeGraph] Saving to database...');

      // Save nodes
      const nodeInserts = Array.from(this.nodes.values()).map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        properties: node.properties,
        confidence: node.confidence,
        created_at: node.timestamp.toISOString(),
      }));

      if (nodeInserts.length > 0) {
        const { error: nodeError } = await supabase
          .from('knowledge_graph_nodes')
          .upsert(nodeInserts);

        if (nodeError) throw nodeError;
      }

      // Save relationships
      const relInserts = Array.from(this.relationships.values()).map((rel) => ({
        id: rel.id,
        type: rel.type,
        from_node_id: rel.fromNodeId,
        to_node_id: rel.toNodeId,
        weight: rel.weight,
        properties: rel.properties,
        confidence: rel.confidence,
        created_at: rel.timestamp.toISOString(),
      }));

      if (relInserts.length > 0) {
        const { error: relError } = await supabase
          .from('knowledge_graph_relationships')
          .upsert(relInserts);

        if (relError) throw relError;
      }

      console.log('[KnowledgeGraph] Saved successfully');
    } catch (err) {
      console.error('[KnowledgeGraph] Error saving to database:', err);
    }
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.nodes.clear();
    this.relationships.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  /**
   * Get statistics about the graph
   */
  getStatistics() {
    return {
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      nodeTypes: this.getNodeTypeDistribution(),
      relationshipTypes: this.getRelationshipTypeDistribution(),
      avgDegree: this.calculateAverageDegree(),
    };
  }

  /**
   * Helper: Construct path from node IDs
   */
  private constructPath(nodeIds: string[]): KnowledgePath | null {
    const nodes: KnowledgeNode[] = [];
    const relationships: KnowledgeRelationship[] = [];
    let totalWeight = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      const node = this.nodes.get(nodeIds[i]);
      if (!node) return null;
      nodes.push(node);

      if (i < nodeIds.length - 1) {
        const relationship = Array.from(this.relationships.values()).find(
          (rel) => rel.fromNodeId === nodeIds[i] && rel.toNodeId === nodeIds[i + 1]
        );
        if (!relationship) return null;
        relationships.push(relationship);
        totalWeight += relationship.weight;
      }
    }

    return {
      nodes,
      relationships,
      length: relationships.length,
      totalWeight,
    };
  }

  /**
   * Helper: Get node type distribution
   */
  private getNodeTypeDistribution(): Record<NodeType, number> {
    const distribution: Partial<Record<NodeType, number>> = {};
    Array.from(this.nodes.values()).forEach((node) => {
      distribution[node.type] = (distribution[node.type] || 0) + 1;
    });
    return distribution as Record<NodeType, number>;
  }

  /**
   * Helper: Get relationship type distribution
   */
  private getRelationshipTypeDistribution(): Record<RelationType, number> {
    const distribution: Partial<Record<RelationType, number>> = {};
    Array.from(this.relationships.values()).forEach((rel) => {
      distribution[rel.type] = (distribution[rel.type] || 0) + 1;
    });
    return distribution as Record<RelationType, number>;
  }

  /**
   * Helper: Calculate average degree (connections per node)
   */
  private calculateAverageDegree(): number {
    if (this.nodes.size === 0) return 0;
    let totalDegree = 0;
    this.adjacencyList.forEach((connections) => {
      totalDegree += connections.size;
    });
    return totalDegree / this.nodes.size;
  }
}

/**
 * Singleton instance
 */
export const knowledgeGraph = new KnowledgeGraph();
