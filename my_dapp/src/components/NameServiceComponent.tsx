import { useABWallet } from "@/hooks/useABWallet";
import { FileText } from "lucide-react";
import { useCallback, useState } from "react";

export const NameService = () => {
    const [nameSearch, setNameSearch] = useState<string>('');
    const [nameToRegister, setNameToRegister] = useState<string>('');
    const [nameInfo, setNameInfo] = useState(null);
    const [userNames, setUserNames] = useState(['motel.avax', 'gamer123.avax']);
    const [isRegisteringName, setIsRegisteringName] = useState(false);
    
    const abWallet = useABWallet();
    
    const handleRegisterName = useCallback(async () => {
        let name: string = '';
        let duration: number = 0;
        setIsRegisteringName(true);
        
        try {
            await abWallet.registerNameService(name, duration);
            console.log('Mock name service registered successfully');
        } catch (error) {
            console.error('Failed to register name:', error);
        } finally {
            setIsRegisteringName(false);
        }
    }, [abWallet]);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl
            p-6 border border-purple-500/30">
                <div className="flex items-center mb-4">
                    <FileText className="mr-3 text-purple-400" size={24} />
                    <h3 className="text-xl font-bold text-white">Motel Name Service</h3> 
                </div>
                <p className="text-gray-300 text-sm">
                    Register and manage your .motel or .avax domain names for easy wallet
                    identifiaction and transfers.
                </p>
            </div>
            {/** Register Name */}    
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6
            border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Register New Name</h3>
                <div className="space-y-3">
                    <input 
                    type="text"
                    value={nameToRegister}
                    onChange={(e: any) => setNameToRegister(e.target.value)}
                    placeholder="yourname.motel yourname.avax"
                    className="w-full bg-gray-700 text-white px-4 py-3
                    rounded border border-gray-600 
                    focus:border-purple-500 focus:outline-none placeholder-gray-400"
                    />
                    <button onClick={handleRegisterName}
                     className="w-full bg-gradient-to-r 
                     from-purple-600 to-indigo-600 hover:from-purple-700
                     hover:to-indigo-700 text-white py-3 px-4 rounded-lg
                     transition-all duration-300 font-medium">
                        Register Name
                     </button>
                     <p className="text-gray-400 text-xs">
                        Registration fee: * Available names are first-come, first-served
                     </p>
                </div>
            </div>

            {/** Check Availablitity */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl
            p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Check Name Availablitity</h3>
                <div className="space-y-3">
                    <input 
                      type="text"
                      value={nameSearch}
                      onChange={(e: any) => setNameSearch(e.target.value)}
                      placeholder="Search name..."
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded
                      border border-gray-600 focus:border-blue-500 focus:outline-none
                      placeholder-gray-400"
                      />
                      <button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white
                        py-3 px-4 rounded-lg transition-all duration-300 font-medium">
                            Check Availablitity
                        </button>
                </div>
            </div>

            {/** Your Name */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border
            border-gray-600">
                <h3 className="text-xl font-bold text-white mb-4">Your Names</h3>
                <div className="space-y-3">
                    {userNames.map((name, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-white font-medium">{name}</span>
                                <span className="text-green-400 text-sm">Active</span>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 bg-blue-600 hover:bg-blue-700
                                text-white py-2 px-3 rounded text-sm transition-colors">
                                    Get Info
                                </button>
                                <button className="flex-1 bg-purple-600 hover:bg-purple-700
                                text-white py-2 px-3 rounded text-sm transition-colors">
                                    Renew
                                </button>
                                <button className="flex-1 bg-orange-600 hover:bg-orange-700 
                                text-white py-2 px-3 rounded text-sm transition-colors">
                                    Expire name
                                </button>
                            </div>
                            <p className="text-gray-400 text-xs mt-2">Expires: December 31, 2026</p>
                        </div>
                    ))}
                </div>
            </div>

            {/** Name Info */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800
            rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Name information</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Select a name or search to view details</p>
                </div>
            </div>
        </div>

    );
}