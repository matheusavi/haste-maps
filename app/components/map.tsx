'use client';
import React, { useEffect, useRef } from 'react';
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
                            'width': '10px', // Adjust as needed
                            'height': '10px', // Adjust as needed
                            'label': '', // Remove the label
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
            let creatingEdges = false;
            let isGraphLocked = false;

            document.getElementById('nodeModeBtn')?.addEventListener('click', () => {
                creatingEdges = !creatingEdges;
                const btn = document.getElementById('nodeModeBtn');
                if (btn) {
                    btn.textContent = creatingEdges ? 'Switch to Node Mode' : 'Switch to Edge Mode';
                }
            });

            document.getElementById('lockGraphBtn')?.addEventListener('click', () => {
                isGraphLocked = !isGraphLocked;
                const btn = document.getElementById('lockGraphBtn');
                if (btn) {
                    btn.textContent = isGraphLocked ? 'Unlock Graph' : 'Lock Graph';
                }
                cy.autoungrabify(isGraphLocked);
            });

            document.getElementById('shortestPathBtn')?.addEventListener('click', () => {
                const sourceNodeId = (document.getElementById('sourceNodeSelect') as HTMLSelectElement).value;
                const targetNodeId = (document.getElementById('targetNodeSelect') as HTMLSelectElement).value;
                if (!sourceNodeId || !targetNodeId) {
                    alert('Please select both source and target nodes.');
                    return;
                }

                const sourceNode = cy.getElementById(sourceNodeId);
                const targetNode = cy.getElementById(targetNodeId);

                const aStarResult = cy.elements().aStar({
                    root: sourceNode,
                    goal: targetNode,
                    weight: edge => parseFloat(edge.data('label')) || 1
                });

                if (aStarResult.found) {
                    cy.elements().removeClass('highlighted');
                    aStarResult.path.forEach(element => {
                        element.addClass('highlighted');
                    });
                } else {
                    alert('No path found!');
                }
            });

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

            cy.on('tap', (event) => {
                if (isGraphLocked) return;

                if (creatingEdges) {
                    if (event.target === cy) return;
                    const sourceNode = event.target;
                    const targetNode = cy.$(':selected');
                    if (targetNode.length === 0) {
                        return;
                    }
                    if (sourceNode.id() === targetNode.id()) {
                        alert('Cannot create an edge to the same node.');
                        return;
                    }
                    const existingEdge = cy.edges().filter(edge => {
                        return (edge.data('source') === sourceNode.id() && edge.data('target') === targetNode.id()) ||
                            (edge.data('source') === targetNode.id() && edge.data('target') === sourceNode.id());
                    });
                    if (existingEdge.length > 0) {
                        alert('An edge already exists between these nodes.');
                        return;
                    }
                    const distance = calculateDistance(sourceNode, targetNode);

                    cy.add({
                        group: 'edges',
                        data: { id: 'edge' + edgeId++, source: sourceNode.id(), target: targetNode.id(), label: distance },
                        classes: 'autorotate'
                    });
                } else {
                    if (event.target === cy) {
                        const position = event.position;
                        cy.add({
                            group: 'nodes',
                            data: { id: 'node' + nodeId++ },
                            position: { x: position.x, y: position.y }
                        });
                        updateNodeSelectors();
                    }
                }
            });

            cy.on('dragfree', 'node', (event) => {
                if (isGraphLocked) return;
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

            function updateNodeSelectors() {
                const sourceNodeSelect = document.getElementById('sourceNodeSelect') as HTMLSelectElement;
                const targetNodeSelect = document.getElementById('targetNodeSelect') as HTMLSelectElement;
                sourceNodeSelect.innerHTML = '<option value="">Select Source Node</option>';
                targetNodeSelect.innerHTML = '<option value="">Select Target Node</option>';
                cy.nodes().forEach(node => {
                    if (node.id() !== 'bg') {  // Exclude the background image node
                        const option = document.createElement('option');
                        option.value = node.id();
                        option.text = node.id();
                        sourceNodeSelect.appendChild(option);
                        targetNodeSelect.appendChild(option.cloneNode(true));
                    }
                });
            }
            updateNodeSelectors();

        };
    }, []);

    return (
        <div className="flex flex-col items-center">
            <div id="controls" className="flex flex-wrap justify-center space-x-4 mb-4 controls bg-transparent">
                <button id="nodeModeBtn" className="px-4 py-2 bg-blue-500 text-white rounded">Switch to Edge Mode</button>
                <button id="lockGraphBtn" className="px-4 py-2 bg-blue-500 text-white rounded">Lock Graph</button>
                <select id="sourceNodeSelect" className="px-4 py-2 border rounded text-black">
                    <option value="">Select Source Node</option>
                </select>
                <select id="targetNodeSelect" className="px-4 py-2 border rounded text-black">
                    <option value="">Select Target Node</option>
                </select>
                <button id="shortestPathBtn" className="px-4 py-2 bg-green-500 text-white rounded">Find Shortest Path</button>
                <label htmlFor="bgImageUpload" className="px-4 py-2 bg-gray-500 text-white rounded cursor-pointer">Upload Background</label>
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
