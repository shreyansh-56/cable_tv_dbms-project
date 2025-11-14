import React, { useState, useEffect, useMemo } from 'react';
import { User, Package, Tv, Calendar, DollarSign, Settings, Plus, Edit, Trash, Zap, Search, MessageSquare, Briefcase, Eye, X } from 'lucide-react';

// Ensure your backend server is running on port 3001
const API_URL = 'http://localhost:3001/api';

const CableTVDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});
    
    // States for Stored Programs
    const [procedureResults, setProcedureResults] = useState(null);
    const [procedureError, setProcedureError] = useState(null);
    const [packageSummary, setPackageSummary] = useState([]);
    const [customerInstallStatuses, setCustomerInstallStatuses] = useState({}); // FIX: New state for function demo

    // Core Data States
    const [customers, setCustomers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [channels, setChannels] = useState([]);
    const [billings, setBillings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [installations, setInstallations] = useState([]);
    const [shows, setShows] = useState([]);
    const [episodes, setEpisodes] = useState([]);

    const [loading, setLoading] = useState(false);

    // --- 1. FETCH ALL DATA FROM BACKEND ---
    const fetchEntityData = async (endpoint, setter) => {
        const res = await fetch(`${API_URL}/${endpoint}`);
        if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
        const data = await res.json();
        setter(data);
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchEntityData('customers', setCustomers),
                fetchEntityData('employees', setEmployees),
                fetchEntityData('installations', setInstallations),
                fetchEntityData('shows', setShows),
                fetchEntityData('episodes', setEpisodes),
                fetchEntityData('packages', setPackages),
                fetchEntityData('channels', setChannels),
                fetchEntityData('subscriptions', setSubscriptions),
                fetchEntityData('billing', setBillings),
                fetchEntityData('views/package-summary', setPackageSummary),
            ]);
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            alert('Failed to load data from the server. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    // --- 1B. FETCH ASYNC FUNCTION DATA (CRITICAL FIX) ---
    useEffect(() => {
        if (customers.length > 0 && activeTab === 'procedures') {
            const fetchStatuses = async () => {
                const statusMap = {};
                // Only fetch for the first 3 customers for the demo UI
                const demoCustomers = customers.slice(0, 3);
                
                await Promise.all(demoCustomers.map(async (c) => {
                    try {
                        const res = await fetch(`${API_URL}/functions/has-active-installation/${c.Customer_ID}`);
                        if (!res.ok) throw new Error('Function fetch failed');
                        const data = await res.json();
                        statusMap[c.Customer_ID] = data?.installed ? data.installed.toString() : '0';
                    } catch (e) {
                        console.error("Error fetching install status:", e);
                        statusMap[c.Customer_ID] = 'ERROR';
                    }
                }));
                setCustomerInstallStatuses(statusMap);
            };
            fetchStatuses();
        }
    }, [customers, activeTab]); // Re-run when customers change or tab changes

    useEffect(() => {
        fetchAllData();
    }, []);

    const openModal = (type, data = {}) => {
        setModalType(type);
        setFormData(data);
        setProcedureResults(null);
        setProcedureError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({});
        setProcedureResults(null);
        setProcedureError(null);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- 2. HANDLE SAVE (POST/PUT) ---
    const handleSave = async () => {
        let endpoint = '';
        const isEdit = modalType.startsWith('edit');
        const method = isEdit ? 'PUT' : 'POST'; 
        
        if (modalType === 'addCustomer') endpoint = `${API_URL}/customers`;
        else if (modalType === 'addEmployee') endpoint = `${API_URL}/employees`;
        else if (modalType === 'addPackage') endpoint = `${API_URL}/packages`;
        else if (modalType === 'addChannel') endpoint = `${API_URL}/channels`;
        else if (modalType === 'addInstallation') endpoint = `${API_URL}/installations`;
        else if (modalType === 'addShow') endpoint = `${API_URL}/shows`;
        else if (modalType === 'addEpisode') endpoint = `${API_URL}/episodes`;
        else if (modalType === 'addSubscription') endpoint = `${API_URL}/subscriptions`;
        else if (modalType === 'addBilling') endpoint = `${API_URL}/billing`;

        if (!endpoint) {
            alert(`❌ Invalid operation type: ${modalType}`);
            return;
        }

        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Server error (${response.status}): ${errorData.error || response.statusText}`);
            }

            // Specific message for trigger demonstrations
            if (modalType === 'addCustomer') {
                alert('✅ Customer added! Age was automatically calculated by the **before_customer_insert_update_age** trigger.');
            } else if (modalType === 'addInstallation') {
                alert('✅ Installation scheduled! Employee existence was checked by the **before_installation_insert_validate_employee** trigger.');
            } else if (modalType === 'addEpisode') {
                alert('✅ Episode added! Show episode count was updated by the **after_episode_insert_update_show_episode_count** trigger.');
            } else {
                alert('✅ Saved successfully! UI is updating...');
            }
            
            closeModal();
            await fetchAllData(); 
            
        } catch (error) {
            console.error('❌ Error saving data:', error);
            alert(`❌ Failed to save data. Details: ${error.message}. Check the console for database constraints/trigger messages.`);
        }
    };

    // --- 3. HANDLE DELETE ---
    const handleDelete = async (id, entityType) => {
        if (!window.confirm(`Delete ${entityType} ID: ${id}? This action is irreversible.`)) {
            return;
        }
        
        const endpoint = `${API_URL}/${entityType}/${id}`;

        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Server error (${response.status}): ${errorData.error || response.statusText}. Check for Foreign Key constraints.`);
            }

            alert('✅ Deleted successfully! UI is updating...');
            await fetchAllData(); 

        } catch (error) {
            console.error('❌ Error deleting data:', error);
            alert(`❌ Failed to delete data. Details: ${error.message}`);
        }
    };
    
    // --- PROCEDURE HANDLERS ---
    const handleProcedureCall = async (type, data) => {
        setProcedureResults(null);
        setProcedureError(null);
        setLoading(true);
        
        let endpoint = '';
        if (type === 'NewCustomerSubscription') endpoint = `${API_URL}/procedures/new-customer-subscription`;
        else if (type === 'RecordNewPayment') endpoint = `${API_URL}/procedures/record-payment`;
        else if (type === 'GetChannelsByCategoryAndCity') endpoint = `${API_URL}/procedures/channels-by-city`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || response.statusText);
            }

            const result = await response.json();
            setProcedureResults(result.results || result);
            alert(`✅ Procedure ${type} executed successfully! Results are shown below.`);
            if (type !== 'GetChannelsByCategoryAndCity') {
                 closeModal();
                 await fetchAllData(); 
            }
        } catch (error) {
            console.error(`❌ Procedure ${type} failed:`, error);
            setProcedureError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper Components (unchanged from previous iterations, using existing state)
    const MetricCard = ({ icon: Icon, title, value, subtitle, color }) => (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
              {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
            </div>
            <div className={`${color} bg-opacity-10 p-3 rounded-xl`}>
              <Icon className={`${color.replace('bg-', 'text-')}`} size={24} />
            </div>
          </div>
        </div>
      );

    const NavButton = ({ icon: Icon, label, value, badge }) => (
        <button
            onClick={() => setActiveTab(value)}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all w-full ${
                activeTab === value ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            <div className="flex items-center gap-3">
                <Icon size={20} />
                <span className="font-medium">{label}</span>
            </div>
            {badge && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === value ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );

    const TableHeader = ({ title, onAdd }) => (
        <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {onAdd && (
                <button onClick={onAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={18} /> Add New
                </button>
            )}
        </div>
    );

    const StatusBadge = ({ status }) => {
        const colors = {
            ACTIVE: 'bg-green-100 text-green-700',
            EXPIRED: 'bg-red-100 text-red-700',
            Completed: 'bg-blue-100 text-blue-700',
            Pending: 'bg-yellow-100 text-yellow-700',
            '1': 'bg-green-100 text-green-700', // for HasActiveInstallation function
            '0': 'bg-red-100 text-red-700',
            'ERROR': 'bg-gray-400 text-gray-800',
        };
        const displayStatus = {
            '1': 'INSTALLED',
            '0': 'PENDING',
            'ERROR': 'FETCH ERROR',
        }[status] || status;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
                {displayStatus}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
                <div className="container mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Tv size={32} />
                            <div>
                                <h1 className="text-2xl font-bold">CableTV DBMS</h1>
                                <p className="text-blue-100 text-sm">Management System</p>
                            </div>
                        </div>
                        <button onClick={fetchAllData} className="bg-white bg-opacity-20 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-30 transition-colors">
                            <Settings size={18} /> Refresh Data
                        </button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <aside className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 sticky top-6">
                            <NavButton icon={Settings} label="Dashboard" value="dashboard" />
                            <hr className="my-1 border-gray-100" />
                            <NavButton icon={User} label="Customers" value="customers" badge={customers.length} />
                            <NavButton icon={User} label="Employees" value="employees" badge={employees.length} />
                            <NavButton icon={Package} label="Packages" value="packages" badge={packages.length} />
                            <NavButton icon={Calendar} label="Subscriptions" value="subscriptions" badge={subscriptions.length} />
                            <NavButton icon={Tv} label="Channels" value="channels" badge={channels.length} />
                            <NavButton icon={MessageSquare} label="Shows" value="shows" badge={shows.length} />
                            <NavButton icon={Briefcase} label="Episodes" value="episodes" badge={episodes.length} />
                            <NavButton icon={Settings} label="Installations" value="installations" badge={installations.length} />
                            <NavButton icon={DollarSign} label="Billing" value="billing" badge={billings.length} />
                            <hr className="my-1 border-gray-100" />
                            <NavButton icon={Zap} label="Procedures & Demo" value="procedures" />
                        </div>
                    </aside>

                    <main className="lg:col-span-4">
                        {/* --- Dashboard (Updated to reflect PackageSummary View) --- */}
                        {activeTab === 'dashboard' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                    <MetricCard icon={User} title="Customers" value={customers.length} color="bg-blue-600" />
                                    <MetricCard icon={DollarSign} title="Total Revenue" value={`$${billings.reduce((s, b) => s + (parseFloat(b.Amount || 0) - parseFloat(b.Discount || 0)), 0).toFixed(2)}`} color="bg-green-600" />
                                    <MetricCard icon={Calendar} title="Active Subs" value={subscriptions.filter(s => s.Status === 'ACTIVE').length} color="bg-purple-600" />
                                    <MetricCard icon={Settings} title="Pending Inst." value={installations.filter(i => !i.Employee_Id).length} color="bg-orange-600" />
                                </div>
                                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                    <h3 className="text-lg font-bold mb-4">View Demonstration: Package Channel Count</h3>
                                    <p className="text-sm text-gray-500 mb-4">This table uses the **`PackageSummary`** view and the **`GetPackageChannelCount`** function to show channel counts per package.</p>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Package</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Cost</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Total Channels</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Cost/Mo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {packageSummary.map(pkg => (
                                                    <tr key={pkg.Package_Id}>
                                                        <td className="px-3 py-2 text-sm font-medium">{pkg.Package_Name}</td>
                                                        <td className="px-3 py-2 text-sm">${pkg.Cost}</td>
                                                        <td className="px-3 py-2 text-sm text-blue-600 font-bold">{pkg.Total_Channels}</td>
                                                        <td className="px-3 py-2 text-sm">${pkg.Cost_Per_Month}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- Customers (Updated to show Age calculated by trigger) --- */}
                        {activeTab === 'customers' && (
                            <div>
                                <TableHeader title="Customer Management" onAdd={() => openModal('addCustomer')} />
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Age (Trigger Demo)</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">City</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {customers.map((c) => (
                                                <tr key={c.Customer_ID} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium">{c.Customer_ID}</td>
                                                    <td className="px-6 py-4 text-sm">{c.First_Name} {c.Last_Name}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-green-600">{c.Age || 'N/A'}</td> {/* Age from trigger */}
                                                    <td className="px-6 py-4 text-sm">{c.City}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleDelete(c.Customer_ID, 'customers')} className="text-red-600 hover:text-red-800">
                                                                <Trash size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {/* --- Employees (Delete handler updated) --- */}
                        {activeTab === 'employees' && (
                            <div>
                                <TableHeader title="Employee Management" onAdd={() => openModal('addEmployee')} />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {employees.map((emp) => (
                                        <div key={emp.Employee_Id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                                  {emp.Name ? emp.Name.charAt(0) : '?'}
                                                </div>
                                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                                                  {emp.Role || 'Staff'}
                                                </span>
                                              </div>
                                              <h3 className="text-lg font-bold text-gray-900 mb-1">{emp.Name}</h3>
                                              <p className="text-sm text-gray-500 mb-1">{emp.Employee_Id}</p>
                                              <p className="text-sm text-gray-600 mb-4">{emp.Contact}</p>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => handleDelete(emp.Employee_Id, 'employees')} className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- Installations (Delete handler updated) --- */}
                        {activeTab === 'installations' && (
                            <div>
                                <TableHeader title="Installation Records (Trigger Demo)" onAdd={() => openModal('addInstallation')} />
                                <p className="mb-4 text-sm text-gray-500">Adding a new installation triggers **`before_installation_insert_validate_employee`**, which fails if the Employee ID does not exist.</p>
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Technician ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {installations.map((inst) => (
                                                <tr key={inst.Installation_Id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium">{inst.Installation_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{new Date(inst.Date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-sm">{inst.Customer_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{inst.Employee_Id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- Shows (Updated to show Episode_Count by trigger) --- */}
                        {activeTab === 'shows' && (
                            <div>
                                <TableHeader title="Shows & Episode Counts (Trigger Demo)" onAdd={() => openModal('addShow')} />
                                <p className="mb-4 text-sm text-gray-500">The **Episode Count** updates automatically via the **`after_episode_insert_update_show_episode_count`** trigger when a new episode is added.</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {shows.map((show) => (
                                        <div key={show.Show_Id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                            <div className="flex items-start justify-between mb-4">
                                              <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                                  <Tv size={24} className="text-purple-600" />
                                                </div>
                                                <div>
                                                  <h3 className="text-lg font-bold text-gray-900">{show.Name}</h3>
                                                  <p className="text-sm text-gray-500">{show.Show_Id} • {show.Channel_Id}</p>
                                                </div>
                                              </div>
                                              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                                                {show.Genre}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-gray-600">
                                                    <span className="font-semibold text-gray-900">{show.Episode_Count}</span> Episodes
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal('addEpisode', { Show_Id: show.Show_Id })} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">
                                                        + Add Episode
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- NEW TAB: Episodes --- */}
                        {activeTab === 'episodes' && (
                            <div>
                                <TableHeader title="Episode Management" onAdd={() => openModal('addEpisode')} />
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Show ID</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Episode No</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Air Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {episodes.map((e) => (
                                                <tr key={`${e.Show_Id}-${e.Episode_No}`} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium">{e.Show_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{e.Episode_No}</td>
                                                    <td className="px-6 py-4 text-sm">{e.Title}</td>
                                                    <td className="px-6 py-4 text-sm">{new Date(e.Air_Date).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- NEW TAB: PACKAGES --- */}
                        {activeTab === 'packages' && (
                            <div>
                                <TableHeader title="Package Plans" onAdd={() => openModal('addPackage')} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {packages.map((pkg) => (
                                        <div key={pkg.Package_Id} className="bg-white rounded-xl shadow-sm p-8 border-2 border-gray-100 hover:border-blue-500 transition-all hover:shadow-lg">
                                            <div className="text-center mb-6">
                                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.Name}</h3>
                                                <div className="text-4xl font-bold text-blue-600 mb-1">${pkg.Cost}</div>
                                                <p className="text-sm text-gray-500">for {pkg.Duration} month(s)</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDelete(pkg.Package_Id, 'packages')} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- NEW TAB: CHANNELS --- */}
                        {activeTab === 'channels' && (
                            <div>
                                <TableHeader title="Channel Catalog" onAdd={() => openModal('addChannel')} />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {channels.map((ch) => (
                                        <div key={ch.Channel_Id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                                    <Tv size={20} className="text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 text-sm">{ch.Name}</h3>
                                                    <p className="text-xs text-gray-500">{ch.Channel_Id}</p>
                                                </div>
                                            </div>
                                            <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-700 font-medium mb-3">
                                                {ch.Category}
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDelete(ch.Channel_Id, 'channels')} className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* --- NEW TAB: SUBSCRIPTIONS --- */}
                        {activeTab === 'subscriptions' && (
                            <div>
                                <TableHeader title="Subscription Management" onAdd={() => openModal('addSubscription')} />
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Package</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Start Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">End Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status (Function Demo)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {subscriptions.map((sub) => (
                                                <tr key={sub.Subscription_Id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium">{sub.Subscription_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{sub.Customer_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{sub.Package_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{new Date(sub.Start_Date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-sm">{new Date(sub.End_Date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-sm"><StatusBadge status={sub.Status} /></td> {/* Status from GetSubscriptionStatus function */}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {/* --- NEW TAB: BILLING --- */}
                        {activeTab === 'billing' && (
                            <div>
                                <TableHeader title="Billing & Payments" onAdd={() => openModal('addBilling')} />
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Discount</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {billings.map((bill) => (
                                                <tr key={bill.Billing_Id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium">{bill.Billing_Id}</td>
                                                    <td className="px-6 py-4 text-sm">{bill.Customer_Id}</td>
                                                    <td className="px-6 py-4 text-sm">${bill.Amount}</td>
                                                    <td className="px-6 py-4 text-sm text-green-600">-${bill.Discount}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-blue-600">
                                                      ${(parseFloat(bill.Amount) - parseFloat(bill.Discount)).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">{new Date(bill.Date).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}


                        {/* --- NEW TAB: PROCEDURES / FUNCTIONS --- */}
                        {activeTab === 'procedures' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Database Procedures & Functions</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Procedure 1: New Customer Subscription */}
                                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap size={18} /> New Customer Signup</h3>
                                        <p className="text-sm text-gray-500 mb-4">Calls the **`NewCustomerSubscription`** procedure (Inserts Customer + Subscription).</p>
                                        <button onClick={() => openModal('NewCustomerSubscription', {})} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Run Procedure</button>
                                    </div>
                                    
                                    {/* Procedure 2: Record Payment */}
                                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><DollarSign size={18} /> Record Payment</h3>
                                        <p className="text-sm text-gray-500 mb-4">Calls the **`RecordNewPayment`** procedure to insert a Billing record.</p>
                                        <button onClick={() => openModal('RecordNewPayment', {})} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Run Procedure</button>
                                    </div>

                                    {/* Procedure 3: Channels by City */}
                                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Search size={18} /> Channels by City/Category</h3>
                                        <p className="text-sm text-gray-500 mb-4">Calls the **`GetChannelsByCategoryAndCity`** procedure for detailed query.</p>
                                        <button onClick={() => openModal('GetChannelsByCategoryAndCity', {})} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Run Procedure</button>
                                    </div>
                                </div>
                                
                                {/* Function and View Demonstration */}
                                <div className="mt-8">
                                    <h3 className="text-xl font-bold mb-4">Function & View Results</h3>
                                    
                                    {/* Function 1: HasActiveInstallation (FIXED ASYNC RENDERING) */}
                                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
                                        <h4 className="font-semibold mb-3">Function: Customer Installation Status (`HasActiveInstallation`)</h4>
                                        <p className="text-xs text-gray-500 mb-3">Tests if the customer has an active installation record (where Employee_Id is assigned).</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            {customers.slice(0, 3).map((c) => (
                                                <div key={c.Customer_ID} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                                    <p className="font-medium text-sm">{c.First_Name} ({c.Customer_ID})</p>
                                                    <StatusBadge status={customerInstallStatuses[c.Customer_ID] || 'Loading'} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Function 2/View: Package Summary (Already on Dashboard) */}
                                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                        <h4 className="font-semibold mb-3">Function: Subscription Status (`GetSubscriptionStatus`)</h4>
                                        <p className="text-xs text-gray-500 mb-3">Shows the current status based on `End_Date` vs `CURDATE()` (Function is applied on the Subscription list query).</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            {subscriptions.slice(0, 3).map((sub) => (
                                                <div key={sub.Subscription_Id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                                    <p className="font-medium text-sm">Sub {sub.Subscription_Id}</p>
                                                    <StatusBadge status={sub.Status} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                {/* Procedure Call Results Display */}
                                {procedureResults && (
                                    <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
                                        <p className="font-bold mb-2">Procedure Results:</p>
                                        <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded overflow-auto">{JSON.stringify(procedureResults, null, 2)}</pre>
                                    </div>
                                )}
                                {procedureError && (
                                    <div className="mt-8 p-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                                        <p className="font-bold mb-2">Procedure Error:</p>
                                        <p className="text-sm">{procedureError}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* --- End of main content --- */}
                    </main>
                </div>
            </div>

            {/* --- MODAL FORMS --- */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">{modalType}</h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            
                            {/* --- ADD CUSTOMER (TRIGGER DEMO) --- */}
                            {modalType === 'addCustomer' && (
                                <>
                                    <p className="text-sm text-gray-500">The `Age` field will be auto-calculated using the **Date of Birth** field by the `before_customer_insert_update_age` trigger.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label><input name="Customer_ID" onChange={handleInputChange} type="text" placeholder="C105" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">First Name</label><input name="First_Name" onChange={handleInputChange} type="text" placeholder="John" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label><input name="Last_Name" onChange={handleInputChange} type="text" placeholder="Doe (Optional)" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label><input name="Phone_No" onChange={handleInputChange} type="text" placeholder="555-0000" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">City</label><input name="City" onChange={handleInputChange} type="text" placeholder="Seattle" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label><input name="Date_of_Birth" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                </>
                            )}
                            
                            {/* --- ADD EMPLOYEE --- */}
                            {modalType === 'addEmployee' && (
                                <>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label><input name="Employee_Id" onChange={handleInputChange} type="text" placeholder="E005" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label><input name="Name" onChange={handleInputChange} type="text" placeholder="John Smith" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Contact</label><input name="Contact" onChange={handleInputChange} type="text" placeholder="email@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                </>
                            )}

                            {/* --- ADD INSTALLATION (TRIGGER DEMO) --- */}
                            {modalType === 'addInstallation' && (
                                <>
                                    <p className="text-sm text-red-500 font-medium">Try entering an Employee ID that doesn't exist (e.g., E999) to see the **`before_installation_insert_validate_employee`** trigger fail.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Installation ID</label><input name="Installation_Id" onChange={handleInputChange} type="text" placeholder="I003" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Date</label><input name="Date" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label><input name="Customer_Id" onChange={handleInputChange} type="text" placeholder="C101" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Technician (Employee ID)</label><input name="Employee_Id" onChange={handleInputChange} type="text" placeholder="E002 (Must exist!)" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                </>
                            )}
                            
                            {/* --- ADD SHOW --- */}
                            {modalType === 'addShow' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Show ID</label><input name="Show_Id" onChange={handleInputChange} type="text" placeholder="SH04" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Channel ID</label><input name="Channel_Id" onChange={handleInputChange} type="text" placeholder="CH01" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Show Name</label><input name="Name" onChange={handleInputChange} type="text" placeholder="Morning Talk Show" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Genre</label><input name="Genre" onChange={handleInputChange} type="text" placeholder="Talk Show" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                </>
                            )}

                            {/* --- ADD EPISODE (TRIGGER DEMO) --- */}
                            {modalType === 'addEpisode' && (
                                <>
                                    <p className="text-sm text-gray-500">Adding this episode will automatically update the total **Episode Count** on the linked Show record via the **`after_episode_insert_update_show_episode_count`** trigger.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Show ID</label><input name="Show_Id" onChange={handleInputChange} type="text" value={formData.Show_Id || ''} placeholder="SH01 (Must exist)" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Episode No</label><input name="Episode_No" onChange={handleInputChange} type="number" placeholder="3" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Title</label><input name="Title" onChange={handleInputChange} type="text" placeholder="New Episode Title" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Air Date</label><input name="Air_Date" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                </>
                            )}
                            
                            {/* --- ADD PACKAGE --- */}
                            {modalType === 'addPackage' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Package ID</label><input name="Package_Id" onChange={handleInputChange} type="text" placeholder="P004" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Name</label><input name="Name" onChange={handleInputChange} type="text" placeholder="Premium Plus" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Duration (months)</label><input name="Duration" onChange={handleInputChange} type="number" placeholder="12" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Cost ($)</label><input name="Cost" onChange={handleInputChange} type="number" step="0.01" placeholder="99.99" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                </>
                            )}
                            
                            {/* --- ADD CHANNEL --- */}
                            {modalType === 'addChannel' && (
                                <>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Channel ID</label><input name="Channel_Id" onChange={handleInputChange} type="text" placeholder="CH05" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Name</label><input name="Name" onChange={handleInputChange} type="text" placeholder="Discovery Channel" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Category</label><input name="Category" onChange={handleInputChange} type="text" placeholder="Documentary" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                </>
                            )}
                            
                            {/* --- ADD SUBSCRIPTION --- */}
                            {modalType === 'addSubscription' && (
                                <>
                                    <p className="text-sm text-gray-500">Note: Use the `New Customer Signup` procedure in the Demo tab if you want to create a Customer and Subscription at once.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Subscription ID</label><input name="Subscription_Id" onChange={handleInputChange} type="text" placeholder="S504" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label><input name="Customer_Id" onChange={handleInputChange} type="text" placeholder="C101" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Package ID</label><input name="Package_Id" onChange={handleInputChange} type="text" placeholder="P001" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label><input name="Start_Date" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">End Date</label><input name="End_Date" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                </>
                            )}
                            
                            {/* --- ADD BILLING --- */}
                            {modalType === 'addBilling' && (
                                <>
                                    <p className="text-sm text-gray-500">Note: Use the `Record Payment` procedure in the Demo tab if you want the `Date` to be automatically set to `CURDATE()`.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Billing ID</label><input name="Billing_Id" onChange={handleInputChange} type="text" placeholder="B604" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label><input name="Customer_Id" onChange={handleInputChange} type="text" placeholder="C101" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Amount</label><input name="Amount" onChange={handleInputChange} type="number" step="0.01" placeholder="79.99" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Discount</label><input name="Discount" onChange={handleInputChange} type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Date</label><input name="Date" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                </>
                            )}

                            {/* --- PROCEDURE: NewCustomerSubscription --- */}
                            {modalType === 'NewCustomerSubscription' && (
                                <>
                                    <p className="text-sm text-gray-500">This procedure handles all inserts in one call (Customer, Subscription). The subscription start date will be **`CURDATE()`**.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label><input name="customer_id" onChange={handleInputChange} type="text" placeholder="C105" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">First Name</label><input name="first_name" onChange={handleInputChange} type="text" placeholder="Jack" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone No</label><input name="phone_no" onChange={handleInputChange} type="text" placeholder="555-1234" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">City</label><input name="city" onChange={handleInputChange} type="text" placeholder="Tacoma" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label><input name="date_of_birth" onChange={handleInputChange} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Package ID</label><input name="package_id" onChange={handleInputChange} type="text" placeholder="P001" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Subscription ID</label><input name="subscription_id" onChange={handleInputChange} type="text" placeholder="S504" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div className="flex gap-3 mt-8">
                                        <button onClick={() => handleProcedureCall('NewCustomerSubscription', formData)} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium">Create Customer & Sub</button>
                                    </div>
                                </>
                            )}

                            {/* --- PROCEDURE: RecordNewPayment --- */}
                            {modalType === 'RecordNewPayment' && (
                                <>
                                    <p className="text-sm text-gray-500">This procedure records a new payment (`Date` set to **`CURDATE()`**).</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Billing ID</label><input name="billing_id" onChange={handleInputChange} type="text" placeholder="B604" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label><input name="customer_id" onChange={handleInputChange} type="text" placeholder="C101" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Amount</label><input name="amount" onChange={handleInputChange} type="number" step="0.01" placeholder="79.99" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Discount</label><input name="discount" onChange={handleInputChange} type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    </div>
                                    <div className="flex gap-3 mt-8">
                                        <button onClick={() => handleProcedureCall('RecordNewPayment', formData)} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium">Record Payment</button>
                                    </div>
                                </>
                            )}

                            {/* --- PROCEDURE: GetChannelsByCategoryAndCity --- */}
                            {modalType === 'GetChannelsByCategoryAndCity' && (
                                <>
                                    <p className="text-sm text-gray-500">This complex query procedure returns available channels filtered by customer city and channel category.</p>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Category</label><input name="category" onChange={handleInputChange} type="text" placeholder="News or Sports" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">City</label><input name="city" onChange={handleInputChange} type="text" placeholder="Seattle or Redmond" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                                    <div className="flex gap-3 mt-8">
                                        <button onClick={() => handleProcedureCall('GetChannelsByCategoryAndCity', formData)} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium">Search Channels</button>
                                    </div>
                                </>
                            )}
                            
                            {/* --- Generic Save Button for CRUD Modals --- */}
                            {['addCustomer', 'addEmployee', 'addInstallation', 'addShow', 'addEpisode', 'addPackage', 'addChannel', 'addSubscription', 'addBilling'].includes(modalType) && (
                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={handleSave} 
                                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200"
                                    >
                                        Save Changes & Run Triggers
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CableTVDashboard;
