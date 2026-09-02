import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchClassAttendance } from '../../services/api/Api';

const FullAttendance = () => {
  const { className } = useParams();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);

  const columnsPerPage = 7;

  const formatInputDate = (inputDate) => {
    if (!inputDate) return '';
    const dateObj = new Date(inputDate);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear().toString().slice(2);
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    return `${day}/${month}/${year} (${weekday})`;
  };

  useEffect(() => {
    fetchClassAttendance(className)
      .then((data) => {
        setData(data);
        setFilteredData(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message || 'Failed to fetch attendance.');
        setLoading(false);
      });
  }, [className]);

  const getAllHeaders = () => {
    const headersSet = new Set();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => headersSet.add(key));
    });
    const allHeaders = Array.from(headersSet);
    const studentKey = allHeaders.find((h) => h.toLowerCase().includes('student'));
    const dateHeaders = allHeaders.filter((h) => h !== studentKey).sort();
    return [studentKey, ...dateHeaders];
  };

  const allHeaders = getAllHeaders();
  const studentKey = allHeaders[0];
  const dateHeaders = allHeaders.slice(1);

  const totalPages = Math.ceil(dateHeaders.length / columnsPerPage);
  const currentPageDates = dateHeaders.slice(
    page * columnsPerPage,
    page * columnsPerPage + columnsPerPage
  );

  let headers = [studentKey];
  const formattedDate = formatInputDate(dateFilter);
  if (dateFilter) {
    const matchedDate = dateHeaders.find((date) => date === formattedDate);
    if (matchedDate) {
      headers.push(matchedDate);
    }
  } else {
    headers = [studentKey, ...currentPageDates];
  }

  useEffect(() => {
    const formattedDate = formatInputDate(dateFilter);
    const filtered = data.filter((item) => {
      const name = item[studentKey]?.toLowerCase() || '';
      const matchesName = name.includes(nameFilter.toLowerCase());

      const matchesDate = dateFilter
        ? item[formattedDate] !== null &&
          item[formattedDate] !== undefined &&
          item[formattedDate] !== ''
        : true;

      return matchesName && matchesDate;
    });
    setFilteredData(filtered);
  }, [nameFilter, dateFilter, data, studentKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-300 text-sm">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 dark:bg-gray-900">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 dark:text-red-300 font-medium">Failed to load data, Try Again</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen flex justify-center mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-7xl overflow-x-auto">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          <i className="fa-solid fa-chalkboard-user mr-2" />
          Attendance Table
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap justify-start gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Name:
            </label>
            <input
              type="text"
              placeholder="Enter student name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white px-3 py-2 rounded-md focus:outline-none w-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Date:
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white px-3 py-2 rounded-md focus:outline-none w-60"
            />
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-auto">
          <table className="min-w-[900px] w-full border-collapse rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <thead className="bgTheme text-white dark:bg-gray-700">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-center text-nowrap font-semibold border-b border-gray-300 dark:border-gray-500 whitespace-nowrap"
                    style={{ minWidth: '120px' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="text-center text-nowrap py-6 text-gray-500 dark:text-gray-300"
                  >
                    Attendance Not Found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    {headers.map((header, i) => (
                      <td
                        key={i}
                        className="px-4 py-3 text-nowrap text-center text-sm text-gray-800 dark:text-gray-100 border-t border-gray-200 dark:border-gray-600"
                        style={{ minWidth: '120px', wordBreak: 'break-word' }}
                      >
                        {item[header] || '--'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!dateFilter && (
          <div className="flex justify-center mt-6 gap-4">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className={`text-white text-sm px-4 py-2 rounded ${
                page === 0
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bgTheme hover:opacity-90'
              }`}
            >
              <i className="fa-solid fa-arrow-left mr-1" />
              Previous
            </button>

            <span className="text-sm text-gray-700 dark:text-gray-300 py-2">
              Page {page + 1} of {totalPages}
            </span>

            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className={`text-white text-sm px-4 py-2 rounded ${
                page >= totalPages - 1
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bgTheme hover:opacity-90'
              }`}
            >
              Next
              <i className="fa-solid fa-arrow-right ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullAttendance;
