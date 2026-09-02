import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";

const CreateCategory = () => {
    const { axiosInstance } = useContext(AuthContext);

    const [category, setCategory] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [addCategory, setAddCategory] = useState("");
    const [addLoading, setAddLoading] = useState(false);

    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [modalOpen, setModalOpen] = useState(false);


    // Fetch categories
    const getExpenseCategory = async () => {
        try {
            const res = await axiosInstance.get("/d/Expense-Category/");
            setCategory(res.data);
        } catch (err) {
            console.error("Error fetching categories", err);
        }
    };

    useEffect(() => {
        getExpenseCategory();
    }, []);


  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addCategory.trim()) {
        setModalMessage("Category name is required");
        return setModalOpen(true);
    }

    setAddLoading(true);
    try {
        const res = await axiosInstance.post("/d/Expense-Category/", { name: addCategory });
        if (res.status === 201 || res.status === 200) {
            setAddCategory("");
            setModalMessage("Category added successfully!");
            setModalOpen(true);
            getExpenseCategory();
        }
    } catch (err) {
        // User-friendly fallback message
        let friendlyMessage = "Unable to add category. Please check your internet connection or try again later.";

        if (err.response?.data) {
            const data = err.response.data;
            if (data.detail) {
                friendlyMessage = data.detail;
            } else if (data.name && Array.isArray(data.name)) {
                friendlyMessage = data.name.join(" "); // Join all messages if array
            }
        }

        setModalMessage(friendlyMessage);
        setModalOpen(true);
    } finally {
        setAddLoading(false);
    }
};




    // Edit category
    const handleEditClick = (cat) => {
        setEditId(cat.id);
        setEditName(cat.name);
    };

    const handleUpdate = async (id) => {
        if (!editName.trim()) return;
        setEditLoading(true);
        try {
            await axiosInstance.patch(`/d/Expense-Category/${id}/`, { name: editName });
            setEditId(null);
            setEditName("");
            getExpenseCategory();
        } catch (err) {
            console.error("Error updating category", err);
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/d/Expense-Category/${id}/`);
            setModalMessage("Category deleted successfully!");
            setModalOpen(true);
            getExpenseCategory();
        } catch (err) {
            // Assuming API returns 400/409 with detail when related records exist
            setModalMessage(err.response?.data?.detail || "Unable to delete category because related records exist");
            setModalOpen(true);
        }
    };


    // Filter by search
    const filteredCategories = category
        .filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical order


    return (
        <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
                {/* Title */}
                <div className="mb-4 border-b border-gray-300 dark:border-gray-700">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
                        <i className="fa-solid fa-list-check mr-2"></i> Manage Categories
                    </h1>

                    {/*Add + Search Controls */}
                    <form
                        onSubmit={handleAdd}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2"
                    >
                        {/* Left side: Add category */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                value={addCategory}
                                onChange={(e) => setAddCategory(e.target.value.trimStart())}
                                type="text"
                                placeholder="Enter category name"
                                className="border px-3 py-2 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                            />
                            <button
                                type="submit"
                                disabled={addLoading}
                                className="btn bgTheme text-white w-24"
                            >
                                {addLoading ? <i className="fa-solid fa-spinner fa-spin" /> : "Add"}
                            </button>
                        </div>

                        {/* Right side: Search */}
                        <div className="w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search Category"
                                className="border px-3 py-2 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value.trimStart())}
                            />
                        </div>
                    </form>
                </div>

                {/*Table */}
                <div className="w-full overflow-x-auto no-scrollbar rounded-lg max-h-[70vh]">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bgTheme text-white sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">S.NO</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Category</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map((cat, index) => (
                                    <tr key={cat.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap text-center">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap capitalize text-center">
                                            {editId === cat.id ? (
                                                <input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value.trimStart())}
                                                    className="border px-3 py-2 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                                />
                                            ) : (
                                                cat.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300 text-center">
                                            <div className="inline-flex gap-2">
                                                {editId === cat.id ? (
                                                    <button
                                                        onClick={() => handleUpdate(cat.id)}
                                                        disabled={editLoading}
                                                        className="inline-flex items-center px-3 py-1 rounded-md shadow-sm text-sm font-medium bgTheme text-white"
                                                    >
                                                        {editLoading ? <i className="fa-solid fa-spinner fa-spin" /> : "Save"}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditClick(cat)}
                                                        className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="inline-flex items-center px-3 py-1 shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-md"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <i className="fa-solid fa-inbox text-4xl mb-2 text-gray-400 dark:text-gray-600"></i>
                                            <p>No Categories Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal */}
            {modalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Manage Categories</h3>
                        <p className="py-4">{modalMessage}</p>
                        <div className="modal-action">
                            <button
                                className="btn bgTheme text-white w-20"
                                onClick={() => setModalOpen(false)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CreateCategory;