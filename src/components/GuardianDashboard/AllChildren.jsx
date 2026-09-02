import React, { useEffect, useState } from "react";
import { fetchYearLevels } from "../../services/api/Api";
import { Link } from "react-router-dom";

const AllChildren = () => {
    const [yearLevels, setYearLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getYearLevels = async () => {
        setLoading(true);
        try {
            const data = await fetchYearLevels();
            console.log("Fetched year levels:", data);
            setYearLevels(data);
        } catch (err) {
            console.error("Error fetching year levels:", err);
            setError("Failed to fetch year levels. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getYearLevels();
    }, []);

if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <i className="fa-solid fa-spinner fa-spin mr-2 text-4xl" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-5 bg-gray-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-screen-md mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
                    <i className="fa-solid fa-graduation-cap mr-2"></i> All Year Levels
                </h1>

                {error && (
                    <div className="text-red-600 text-center mb-4 font-medium">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto border border-gray-300 rounded-lg overflow-hidden">
                        <thead className="bgTheme text-white">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left">S.NO</th>
                                <th scope="col" className="px-4 py-3 text-left">Year Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {yearLevels.length === 0 ? (
                                <tr>
                                    <td colSpan="2" className="text-center py-6 text-gray-500">
                                        No data found.
                                    </td>
                                </tr>
                            ) : (
                                yearLevels.map((record, index) => (
                                    <tr key={record.id || index} className="hover:bg-blue-50">
                                        <td className="px-4 py-3">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/allStudentsPerClass/${record.id}`}
                                                state={{ level_name: record.level_name }}
                                                className="text-blue-600 hover:underline"

                                            >
                                                {record.level_name}
                                            </Link>

                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllChildren;

