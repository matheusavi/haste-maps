'use client';
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import cyCanvas from 'cytoscape-canvas';


cyCanvas(cytoscape);

const Map: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!cyRef.current) return;

        const background = new Image();
        background.src = './pmap.png';

        background.onload = () => {
            const cy = cytoscape({
                container: cyRef.current,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#0074D9',
                            'width': '10px',
                            'height': '10px',
                            'label': '',
                            'color': '#fff',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'z-index': 1
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#0074D9',
                            'target-arrow-color': '#0074D9',
                            'target-arrow-shape': 'triangle',
                            'label': 'data(label)',
                            'color': '#fff',
                            'text-rotation': 'autorotate',
                            'font-size': 12,
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'z-index': 2
                        }
                    },
                    {
                        selector: '.highlighted',
                        style: {
                            'background-color': '#FF4136',
                            'line-color': '#FF4136',
                            'target-arrow-color': '#FF4136',
                            'transition-property': 'background-color, line-color, target-arrow-color',
                            'transition-duration': 0.5
                        }
                    }
                ],
                elements: []
            });

            const bottomLayer = cy.cyCanvas({
                zIndex: -1
            });
            const canvas = bottomLayer.getCanvas();
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

            cy.on('render cyCanvas.resize', () => {
                bottomLayer.resetTransform(ctx);
                bottomLayer.clear(ctx);
                bottomLayer.setTransform(ctx);

                ctx.save();

                ctx.drawImage(background, 0, 0);
                ctx.restore();
            });

            let nodeId = 0;
            let edgeId = 0;

            document.getElementById('bgImageUpload')?.addEventListener('change', (event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgUrl = e.target?.result as string;
                    const img = new Image();
                    img.onload = () => {

                        background.src = imgUrl;

                        cy.trigger('render');
                    };
                    img.src = imgUrl;
                };
                if (file) {
                    reader.readAsDataURL(file);
                }
            });

            let mode = 'node';
            document.querySelectorAll('input[name="mode"]').forEach((radio) => {
                radio.addEventListener('change', (event) => {
                    mode = (event.target as HTMLInputElement).value;
                });
            });
            let clickedNodes: string[] = [];

            cy.on('tap', (event) => {
                switch (mode) {
                    case 'edge':
                        if (event.target === cy) return;
                        const sourceNode = event.target;
                        const targetNode = cy.$(':selected');
                        if (targetNode.length === 0) {
                            break;
                        }
                        if (sourceNode.id() === targetNode.id()) {
                            alert('Cannot create an edge to the same node.');
                            break;
                        }
                        const existingEdge = cy.edges().filter(edge => {
                            return (edge.data('source') === sourceNode.id() && edge.data('target') === targetNode.id()) ||
                                (edge.data('source') === targetNode.id() && edge.data('target') === sourceNode.id());
                        });
                        if (existingEdge.length > 0) {
                            alert('An edge already exists between these nodes.');
                            break;
                        }
                        const distance = calculateDistance(sourceNode, targetNode);

                        cy.add({
                            group: 'edges',
                            data: { id: 'edge' + edgeId++, source: sourceNode.id(), target: targetNode.id(), label: distance },
                            classes: 'autorotate'
                        });
                        break;
                    case 'node':
                        if (event.target === cy) {
                            const position = event.position;
                            cy.add({
                                group: 'nodes',
                                data: { id: 'node' + nodeId++ },
                                position: { x: position.x, y: position.y }
                            });
                        }
                        break;
                    case 'shortestPath':
                        if (event.target === cy) return;
                        clickedNodes.push(event.target.id());

                        if (clickedNodes.length === 3) {
                            clickedNodes.shift();
                        }

                        if (clickedNodes.length === 2) {
                            const aStarResult = cy.elements().aStar({
                                root: cy.getElementById(clickedNodes[0]),
                                goal: cy.getElementById(clickedNodes[1]),
                                weight: edge => parseFloat(edge.data('label')) || 1
                            });

                            if (aStarResult.found) {
                                cy.elements().removeClass('highlighted');
                                aStarResult.path.forEach(element => {
                                    element.addClass('highlighted');
                                });
                            } else {
                                cy.elements().removeClass('highlighted');
                            }
                        }
                        break;
                }
            });

            cy.on('dragfree', 'node', (event) => {
                const node = event.target;
                node.connectedEdges().forEach((edge: cytoscape.EdgeSingular) => {
                    const sourceNode = cy.getElementById(edge.data('source'));
                    const targetNode = cy.getElementById(edge.data('target'));
                    const distance = calculateDistance(sourceNode, targetNode);
                    edge.data('label', distance);
                });
            });

            function calculateDistance(node1: cytoscape.NodeSingular, node2: cytoscape.NodeSingular): string {
                const position1 = node1.position();
                const position2 = node2.position();
                return Math.sqrt(
                    Math.pow(position2.x - position1.x, 2) +
                    Math.pow(position2.y - position1.y, 2)
                ).toFixed(2);
            }

        };
    }, []);

    return (
        <div className="flex flex-col items-center">
            <div id="controls" className="flex flex-wrap justify-center space-x-4 mb-4 controls bg-transparent">
                <fieldset>
                    <div>
                        <input type="radio" id="nodeMode" name="mode" value="node" />
                        <label htmlFor="nodeMode">Create Nodes</label>
                    </div>
                    <div>
                        <input type="radio" id="edgeMode" name="mode" value="edge" />
                        <label htmlFor="edgeMode">Create Edges</label>
                    </div>
                    <div>
                        <input type="radio" id="shortestPathMode" name="mode" value="shortestPath" />
                        <label htmlFor="shortestPathMode">Find Shortest Path</label>
                    </div>
                </fieldset>
                <label
                    htmlFor="bgImageUpload"
                    className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
                >
                    Upload Image
                </label>
                <input type="file" id="bgImageUpload" accept="image/*" className="hidden" />
            </div>
            <div id="cy" ref={cyRef} style={{ position: 'fixed', top: '0', right: '0', bottom: '0', left: '0', zIndex: '1' }} className="dark:bg-slate-800"></div>
        </div>
    );
};

export default Map;
