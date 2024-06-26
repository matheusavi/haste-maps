'use client';
import React, { useEffect, useRef } from 'react';
import Hints from './hints';
import cytoscape from 'cytoscape';
import cyCanvas from 'cytoscape-canvas';
import { v4 as uuidv4 } from 'uuid';

cyCanvas(cytoscape);

const Map: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);

    let cy: cytoscape.Core;
    const saveLayout = () => {
        if (cy != null) {
            console.log('saving layout...');
            window.localStorage.setItem('savedlayout', JSON.stringify(cy.json()));
        }
    };

    const setDefaultData = async () => {
        if (window.confirm('Are you sure you want to restore the default data? This will overwrite your current data.')) {
            try {
                const response = await fetch('/example.json');
                const data = await response.json();
                window.localStorage.setItem('savedlayout', JSON.stringify(data));
                if (cy) {
                    cy.json(data);
                }
            } catch (error) {
                console.error('Error fetching default data:', error);
            }
        }
    };

    useEffect(() => {
        if (!cyRef.current) return;

        const background = new Image();
        const savedCanvasImage = window.localStorage.getItem('savedCanvasImage');
        if (savedCanvasImage) {
            background.src = savedCanvasImage;
        } else {
            background.src = './pmap.png';
        }

        background.onload = () => {
            cy = cytoscape({
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
                            'label': '',
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

            document.getElementById('bgImageUpload')?.addEventListener('change', (event) => {
                window.localStorage.removeItem('savedlayout');
                const file = (event.target as HTMLInputElement).files?.[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgUrl = e.target?.result as string;
                    const img = new Image();
                    img.onload = () => {
                        background.src = imgUrl;
                        cy.trigger('render');
                        window.localStorage.setItem('savedCanvasImage', imgUrl);
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
                            break;
                        }
                        const distance = calculateDistance(sourceNode, targetNode);

                        cy.add({
                            group: 'edges',
                            data: { id: uuidv4(), source: sourceNode.id(), target: targetNode.id(), label: distance },
                            classes: 'autorotate'
                        });
                        break;
                    case 'node':
                        if (event.target === cy) {
                            const position = event.position;
                            cy.add({
                                group: 'nodes',
                                data: { id: uuidv4() },
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
                    case 'delete':
                        if (event.target === cy) return;
                        event.target.remove();
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

            let stored = window.localStorage.getItem('savedlayout');
            if (stored != null) {
                cy.json(JSON.parse(stored));
            }

            function calculateDistance(node1: cytoscape.NodeSingular, node2: cytoscape.NodeSingular): string {
                const position1 = node1.position();
                const position2 = node2.position();
                return Math.sqrt(
                    Math.pow(position2.x - position1.x, 2) +
                    Math.pow(position2.y - position1.y, 2)
                ).toFixed(2);
            }

        };
        const intervalId = setInterval(saveLayout, 30 * 1000);

        return () => clearInterval(intervalId);
    }, []);
    return (
        <div className="flex flex-col items-center">
            <div id="controls" className="flex flex-wrap justify-between p-2 gap-2 controls bg-slate-500 rounded-xl shadow-md text-white">
                <input type="radio" id="nodeMode" name="mode" value="node" className="hidden peer/node" defaultChecked />
                <label htmlFor="nodeMode" className="cursor-pointer bg-sky-500/30 peer-checked/node:bg-slate-800 rounded-xl p-2">Create Nodes</label>

                <input type="radio" id="edgeMode" name="mode" value="edge" className="hidden peer/edge" />
                <label htmlFor="edgeMode" className="cursor-pointer bg-sky-500/30 peer-checked/edge:bg-slate-800 rounded-xl p-2">Create Edges</label>

                <input type="radio" id="shortestPathMode" name="mode" value="shortestPath" className="hidden peer/shortestPath" />
                <label htmlFor="shortestPathMode" className="cursor-pointer bg-sky-500/30 peer-checked/shortestPath:bg-slate-800 rounded-xl p-2">Find Shortest Path</label>

                <input type="radio" id="deleteMode" name="mode" value="delete" className="hidden peer/delete" />
                <label htmlFor="deleteMode" className="cursor-pointer bg-sky-500/30 peer-checked/delete:bg-slate-800 rounded-xl p-2">Delete Mode</label>
                <div className="pt-2">
                    <label
                        htmlFor="bgImageUpload"
                        className="cursor-pointer underline text-white p-2 rounded-xl"
                    >
                        Upload my own map
                    </label>
                    <input type="file" id="bgImageUpload" accept="image/*" className="hidden" />
                </div>
                <div style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
                    <button
                        onClick={setDefaultData}
                        className="cursor-pointer text-white p-2 rounded-xl bg-sky-500/30"
                    >
                        🔃
                    </button>
                </div>
            </div>
            <Hints />
            <div id="cy" ref={cyRef} style={{ position: 'fixed', top: '0', right: '0', bottom: '0', left: '0', zIndex: '1' }} className="bg-slate-800"></div>
        </div>
    );
};

export default Map;
