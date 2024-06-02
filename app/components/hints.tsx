import { useState } from "react";

export default function Hints() {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            {isOpen && (
                <div className="fixed z-10 p-4 inset-0 overflow-y-auto pointer-events-none text-white">
                    <div className="flex justify-start min-h-screen pt-4 px-4 pb-20 sm:block sm:p-0">
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="bg-slate-500/95 inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full pointer-events-auto">
                            <div className="bg-opacity-75 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-left sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-2xl py-2 leading-6 font-medium " id="modal-title">
                                            Instructions
                                        </h3>
                                        <ul className="list-decimal px-5">
                                            <li>Use the "Create Nodes" option to create nodes at intersections.</li>
                                            <li>Use the "Create Edges" option to represent streets by connecting nodes.</li>
                                            <li>With the "Shortest Path" option selected, you can see the shortest route between the nodes you select.</li>
                                            <li>You can also upload any map you like to have your own GPS.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-xs"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}