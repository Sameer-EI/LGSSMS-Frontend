




import React, { useEffect, useState, useRef } from "react";
import { fetchTransferCertificates } from "../../services/api/Api";
import { constants } from "../../global/constants";

const TransferCertificates = () => {
  const printRef = useRef();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [pdfImageUrl, setPdfImageUrl] = useState(null);
  const pageSize = 10;

  const getTransferCertificates = async (page = 1) => {
    try {
      setLoading(true);
      const data = await fetchTransferCertificates(page, pageSize);
      
      const filteredResults = data.results?.filter(cert => {
        if (cert.files && cert.files.length > 0) {
          const fileUrl = cert.files[0].file || '';
          return !fileUrl.toLowerCase().includes('receipt') && 
                 (fileUrl.toLowerCase().includes('transfer_certificate') || 
                  fileUrl.toLowerCase().includes('transfer-certificate') ||
                  fileUrl.toLowerCase().includes('tc'));
        }
        return false;
      }) || [];
      
      setCertificates(filteredResults);
      setTotalPages(Math.ceil(filteredResults.length / pageSize));
      setTotalItems(filteredResults.length);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError("Failed to load transfer certificates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTransferCertificates(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      getTransferCertificates(newPage);
    }
  };

  // Convert PDF to Image using iframe and canvas
  const convertPdfToImage = (fileUrl) => {
    return new Promise((resolve, reject) => {
      try {
        let normalizedUrl = fileUrl;
        if (normalizedUrl.startsWith("http://localhost:8000")) {
          normalizedUrl = normalizedUrl.replace("http://localhost:8000", constants.baseUrl);
        } else if (!/^https?:\/\//i.test(normalizedUrl)) {
          const baseUrl = constants.baseUrl.endsWith("/") ? constants.baseUrl : `${constants.baseUrl}/`;
          normalizedUrl = new URL(normalizedUrl.replace(/^\/+/, ""), baseUrl).toString();
        }

        // Create an iframe to load the PDF
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '800px';
        iframe.style.height = '1000px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // Load PDF in iframe
        iframe.src = normalizedUrl;

        // Wait for PDF to load
        iframe.onload = function() {
          setTimeout(() => {
            try {
              // Try to access iframe content
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              
              // Create canvas
              const canvas = document.createElement('canvas');
              canvas.width = 800;
              canvas.height = 1000;
              const ctx = canvas.getContext('2d');
              
              // Fill white background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Try to render iframe content to canvas
              try {
                // This might not work for PDF due to CORS
                ctx.drawImage(iframe, 0, 0, 800, 1000);
              } catch (e) {
                // If canvas draw fails, use a different approach
                console.log('Canvas draw failed, using alternative');
              }
              
              // Convert to data URL
              const dataUrl = canvas.toDataURL('image/png');
              
              // Clean up
              document.body.removeChild(iframe);
              
              resolve(dataUrl);
            } catch (e) {
              document.body.removeChild(iframe);
              reject(e);
            }
          }, 3000);
        };

        iframe.onerror = function() {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load PDF'));
        };

        // Fallback: if iframe doesn't load, try alternative method
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            // Use fetch to get PDF and create object URL
            fetch(normalizedUrl)
              .then(response => response.blob())
              .then(blob => {
                const url = URL.createObjectURL(blob);
                resolve(url);
              })
              .catch(reject);
          }
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  };

  // Print function - opens PDF in new window with print dialog
  const handlePrint = async (cert) => {
    if (!cert || !cert.files || cert.files.length === 0) {
      alert("No file is available for this certificate.");
      return;
    }

    setPrinting(true);
    setSelectedCertificate(cert);

    try {
      let fileUrl = cert.files[0].file;
      
      // Normalize URL
      if (fileUrl.startsWith("http://localhost:8000")) {
        fileUrl = fileUrl.replace("http://localhost:8000", constants.baseUrl);
      } else if (!/^https?:\/\//i.test(fileUrl)) {
        const baseUrl = constants.baseUrl.endsWith("/") ? constants.baseUrl : `${constants.baseUrl}/`;
        fileUrl = new URL(fileUrl.replace(/^\/+/, ""), baseUrl).toString();
      }

      // Open PDF in new window with print functionality
      const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      
      if (!printWindow) {
        alert("Please allow pop-ups to print the certificate.");
        setPrinting(false);
        return;
      }

      // Get the file extension
      const fileExt = fileUrl.split('.').pop().toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(fileExt);

      // Write HTML content with embedded PDF or image
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Transfer Certificate - ${cert.student_name || 'Student'}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                background: #f0f0f0; 
                display: flex; 
                flex-direction: column;
                justify-content: center; 
                align-items: center; 
                min-height: 100vh;
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              .container {
                width: 100%;
                max-width: 900px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .toolbar {
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                align-items: center;
              }
              .toolbar button {
                padding: 8px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              .toolbar .print-btn {
                background: #28a745;
                color: white;
              }
              .toolbar .print-btn:hover {
                background: #218838;
              }
              .toolbar .close-btn {
                background: #dc3545;
                color: white;
              }
              .toolbar .close-btn:hover {
                background: #c82333;
              }
              .toolbar .info {
                margin-left: auto;
                color: #6c757d;
                font-size: 13px;
              }
              .content {
                padding: 20px;
                min-height: 600px;
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
              }
              .content img {
                max-width: 100%;
                max-height: 800px;
                object-fit: contain;
              }
              .content object,
              .content embed,
              .content iframe {
                width: 100%;
                min-height: 600px;
                border: none;
              }
              .loading {
                text-align: center;
                padding: 40px;
                color: #6c757d;
              }
              .loading .spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @media print {
                .toolbar {
                  display: none !important;
                }
                body {
                  background: white !important;
                  padding: 0 !important;
                }
                .container {
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }
                .content {
                  padding: 0 !important;
                  min-height: auto !important;
                }
                .content object,
                .content embed,
                .content iframe {
                  min-height: 100vh !important;
                }
                .content img {
                  max-height: 100vh !important;
                }
                .loading {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="toolbar">
                <button class="print-btn" onclick="window.print()">
                  🖨️ Print Certificate
                </button>
                <button class="close-btn" onclick="window.close()">
                  ✕ Close
                </button>
                <span class="info">
                  ${cert.student_name || 'Student'} - ${cert.identities || 'TC'}
                </span>
              </div>
              <div class="content">
                <div class="loading">
                  <div class="spinner"></div>
                  <p>Loading certificate...</p>
                </div>
                ${isImage ? `
                  <img src="${fileUrl}" alt="Transfer Certificate" 
                    onload="this.style.display='block'; document.querySelector('.loading').style.display='none';"
                    onerror="this.style.display='none'; document.querySelector('.loading').innerHTML='<p>Failed to load image. <a href=\\'${fileUrl}\\' target=\\'_blank\\'>Click here to download</a></p>';"
                    style="display:none;"
                  />
                ` : `
                  <object data="${fileUrl}" type="application/pdf" 
                    onload="document.querySelector('.loading').style.display='none';"
                    onerror="document.querySelector('.loading').innerHTML='<p>Failed to load PDF. <a href=\\'${fileUrl}\\' target=\\'_blank\\'>Click here to download</a></p>';"
                  >
                    <embed src="${fileUrl}" type="application/pdf" 
                      onload="document.querySelector('.loading').style.display='none';"
                      onerror="document.querySelector('.loading').innerHTML='<p>Failed to load PDF. <a href=\\'${fileUrl}\\' target=\\'_blank\\'>Click here to download</a></p>';"
                    />
                    <p>Your browser doesn't support PDF viewing. 
                      <a href="${fileUrl}" target="_blank">Click here to download</a>
                    </p>
                  </object>
                `}
              </div>
            </div>
            <script>
              function doPrint() {
                try {
                  window.focus();
                  window.print();
                } catch (e) {
                  console.error('Print failed:', e);
                }
              }
              if (document.readyState === 'complete') {
                doPrint();
              } else {
                window.addEventListener('load', doPrint);
              }
            <\/script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();

    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to open print view. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  // View function - opens PDF in new tab
  const handleView = (fileUrl, studentName) => {
    if (!fileUrl) {
      alert("No file is available for this certificate.");
      return;
    }

    try {
      let normalizedUrl = fileUrl;
      if (normalizedUrl.startsWith("http://localhost:8000")) {
        normalizedUrl = normalizedUrl.replace("http://localhost:8000", constants.baseUrl);
      } else if (!/^https?:\/\//i.test(normalizedUrl)) {
        const baseUrl = constants.baseUrl.endsWith("/") ? constants.baseUrl : `${constants.baseUrl}/`;
        normalizedUrl = new URL(normalizedUrl.replace(/^\/+/, ""), baseUrl).toString();
      }

      window.open(normalizedUrl, '_blank');
    } catch (error) {
      console.error("View failed:", error);
      alert("Failed to open the file. Please try again.");
    }
  };

  const filteredCertificates = certificates.filter((cert) =>
    cert.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.identities?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.year_level?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading transfer certificates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">{error}</p>
        <button
          onClick={() => getTransferCertificates(1)}
          className="mt-4 bgTheme text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles - same as Marksheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          table, th, td {
            border-color: #000 !important;
          }
          .bg-print-yellow {
            background-color: #fbbf24 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-print-blue {
            background-color: #dbeafe !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-print-gray {
            background-color: #e5e7eb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-print-white {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pdf-container {
            width: 100% !important;
            height: 100vh !important;
          }
          .pdf-container object, .pdf-container embed {
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>

      <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
        <div className="bg-white dark:bg-gray-800 max-w-7xl p-6 rounded-lg shadow-lg mx-auto">
          {/* Header - Hidden when printing */}
          <div className="no-print">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                <i className="fa-solid fa-file-pdf mr-2 text-red-500" />
                Transfer Certificates
              </h1>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
                Total: {totalItems} certificate{totalItems !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search by Student Name, ID or Class"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.trimStart())}
                  className="border px-3 py-2 pl-10 rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] no-print">
              <table className="min-w-full text-sm text-left">
                <thead className="bgTheme text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-semibold">S.No</th>
                    <th className="px-6 py-4 font-semibold">Student Name</th>
                    <th className="px-6 py-4 font-semibold">Class</th>
                    <th className="px-6 py-4 font-semibold">Certificate ID</th>
                    <th className="px-6 py-4 font-semibold">Uploaded At</th>
                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm ? (
                          <span>
                            No certificates found for "{searchTerm}".{' '}
                            <button
                              onClick={() => setSearchTerm("")}
                              className="text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              Clear search
                            </button>
                          </span>
                        ) : (
                          'No transfer certificates found.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert, index) => {
                      const fileUrl = cert.files && cert.files.length > 0 ? cert.files[0].file : null;
                      
                      return (
                        <tr key={cert.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-6 py-4 font-medium capitalize">{cert.student_name || "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {cert.year_level || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm">{cert.identities || "N/A"}</td>
                          <td className="px-6 py-4 text-sm">
                            {cert.uploaded_at ? new Date(cert.uploaded_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            {fileUrl ? (
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                <button
                                  onClick={() => handleView(fileUrl, cert.student_name)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm whitespace-nowrap"
                                >
                                  <i className="fa-solid fa-eye"></i>
                                  View
                                </button>
                                <button
                                  onClick={() => handlePrint(cert)}
                                  disabled={printing}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg transition text-sm whitespace-nowrap
                                    ${printing && selectedCertificate?.id === cert.id
                                      ? 'bg-gray-400 cursor-not-allowed' 
                                      : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                  {printing && selectedCertificate?.id === cert.id ? (
                                    <>
                                      <i className="fa-solid fa-spinner fa-spin"></i>
                                      Preparing...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-print"></i>
                                      Print
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No file</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Print Area */}
            <div id="print-area" className="hidden print:block">
              {selectedCertificate && selectedCertificate.files && selectedCertificate.files.length > 0 && (
                <div className="pdf-container" style={{ width: '100%', height: '100vh' }}>
                  <object
                    data={(() => {
                      let url = selectedCertificate.files[0].file;
                      if (url.startsWith("http://localhost:8000")) {
                        url = url.replace("http://localhost:8000", constants.baseUrl);
                      } else if (!/^https?:\/\//i.test(url)) {
                        const baseUrl = constants.baseUrl.endsWith("/") ? constants.baseUrl : `${constants.baseUrl}/`;
                        url = new URL(url.replace(/^\/+/, ""), baseUrl).toString();
                      }
                      return url;
                    })()}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                  >
                    <embed
                      src={(() => {
                        let url = selectedCertificate.files[0].file;
                        if (url.startsWith("http://localhost:8000")) {
                          url = url.replace("http://localhost:8000", constants.baseUrl);
                        } else if (!/^https?:\/\//i.test(url)) {
                          const baseUrl = constants.baseUrl.endsWith("/") ? constants.baseUrl : `${constants.baseUrl}/`;
                          url = new URL(url.replace(/^\/+/, ""), baseUrl).toString();
                        }
                        return url;
                      })()}
                      type="application/pdf"
                      width="100%"
                      height="100%"
                    />
                    <p>Your browser doesn't support PDF viewing. Please download the file.</p>
                  </object>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded border dark:border-gray-600 transition
                      ${currentPage === 1 
                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>

                  <span className="text-sm text-gray-700 dark:text-gray-300 px-3">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded border dark:border-gray-600 transition
                      ${currentPage === totalPages 
                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TransferCertificates;