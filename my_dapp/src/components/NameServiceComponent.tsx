
import {  debounce, provider_ } from "@/hooks/config/configs";
import { useABWallet, UserNames } from "@/hooks/useABWallet";
import { BigNumber, ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Key, Loader2, Plus, X } from "lucide-react";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export const NameService = () => {
    const [nameSearch, setNameSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [status_RenewName, setStatus_RenewName] = useState<string>('');
    const [statusRenewName, setStatusRenewName] = useState<string>('');
    const [errorRenewName, setErrorRenewName] = useState<string>('');
    const [duration, setDuration] = useState<number>();
    const [nameState, setNameState] = useState<string>('');
    const [nameToRenew, setNameToRenew] = useState<string>('');
    const [nameToRegister, setNameToRegister] = useState<string>('');
    
    //const [userNames, setUserNames] = useState(['ab.motel.avax', 'gamer123.motel.avax']);
    const [isRegisteringName, setIsRegisteringName] = useState(false);
    const [error, setError] = useState<string>('');
    const [status, setStatus] = useState('');
    const [nameAvailablity, setNameAvailability] = useState<{
        rawResult: boolean | null;
    }>({
        rawResult: null
    });
    // Add state for renewal modal
    const [renewalModal, setRenewalModal] = useState<{
        isOpen: boolean;
        nameToRenew: string;
        originalDuration?: number
    }>({
        isOpen: false,
        nameToRenew: '',
        originalDuration: undefined
    });

    const [defaultPricing, setDefaultPricing] = useState<{
        oneYear: number, 
        threeYear: number, 
        permanent: number
    }>
    ({
        oneYear: 125000000000000000,
        threeYear: 250000000000000000,
        permanent: 1000000000000000000
    });//oneYear: 125000000000000000, threeYear: 250000000000000000, permanent: 1000000000000000000 
    /**
     * 1: ethers.utils.parseEther("0.125"), // 1 year
             3: ethers.utils.parseEther("0.25"),  // 3 years
             0: ethers.utils.parseEther("1")
     */

    const [selectedRenewalDuration, setSelectedRenewalDuration] = useState<1 | 3>(1);
    const [registrationModal, setRegistrationMoal] = useState({
        isOpen: false,
        step: 'input' as 'input' | 'duration' | 'confirm'
    });

    // UI: toggle to show all names for the current owner
    const [showOwnerNames, setShowOwnerNames] = useState<boolean>(false);
    const [selectedOwnerName, setSelectedOwnerName] = useState<string | null>(null);

    const [nameRegistration, setNameRegistration] = useState({
        name: '',
        duration: 1 as 0 | 1 | 3, // Type guard ensures only valid values
        price: 125000000000000000,
        isAvailable: null as boolean | null,
        checkingAvailability: false
    });

    const [isSearching, setIsSearching] = useState(false);
    
    const { 
        account,
        contracts, 
        connectWallet, 
        registerNameService, 
        checkNamesAvailability,
        renewName,
        expireName,
        nameInfo,
        getNameInfo,
        getUserNames, 
        fetchNamePrices,
        pricing,
        userNames,
        nameDetails
     } = useABWallet();
     console.log("contracts:", contracts);
     console.log("check name:", checkNamesAvailability);
     console.log("name details:", nameDetails);
     console.log("pricing:", pricing);
     console.log("name details: exp:", nameInfo?.expirytime);

    const {isConnected, address} = useAccount();

    const ownerNamesList = useMemo(() => {
        if (!nameInfo?.owner || !nameDetails) return [] as any[];

        const ownerAddr = nameInfo.owner.toLowerCase();

        return Array.from(nameDetails.entries())
            .map(([name, details]: any) => ({ name, ...details }))
            .filter((d: any) => (d.owner || '').toLowerCase() === ownerAddr)
            .map((d: any) => ({
                name: d.name,
                owner: d.owner,
                isPermanent: d.isPermanent,
                isExpired: d.isExpired,
                // expiryTime may be BigNumber or number
                expirytime: d.expiryTime && (d.expiryTime.toNumber ? d.expiryTime.toNumber() : Number(d.expiryTime))
            }));
    }, [nameInfo, nameDetails]);

    const initializeUseABWallet = useCallback(async () => {
        try {
        console.log('🚀️ Initializing useABWallet hook...')    
        const connectToWallet = await connectWallet();
        console.log("connect contracts nameservice address:", contracts?.nameService.connect(connectToWallet.signer).address);
        console.log("initailization of abWallet hook", connectToWallet.account);
 
        console.log("userNames:", userNames);
        
        console.log('✅️ useABWallet initialized successfully');
        } catch (error: any) {
        console.error('❌️ useABWallet initialization failed:', error);
        }
    }, []);
     
    const namePricing = async() => {
        if (!contracts?.nameService && !pricing) return;

        await fetchNamePrices();
        //setDefaultPricing({oneYear, threeYear, permanent})
        
        console.log("pricing....", pricing);
        console.log("pricing tier one:", pricing?.oneYear, "tier three", pricing?.threeYear);
        console.log("top tier:", pricing?.permanent);
        console.log("tier one:", formatEther(BigInt(Number(pricing?.oneYear))));
        console.log("three year:", formatEther(BigInt(Number(pricing?.threeYear))), "permanent:", formatEther(BigInt(Number(pricing?.permanent))));

     //   return {oneYear, threeYear, permanent}
    }

    useEffect(() => {
        console.log("is initializing", initializeUseABWallet());
     
    }, [ contracts?.nameService]); 


    // Price calculation with type safety
    const calculatePrice = (duration: 0 | 1 | 3): number => {
        namePricing()
        const prices = {
            0: defaultPricing.permanent,
            1: defaultPricing.oneYear,
            3: defaultPricing.threeYear
        }
        console.log("calculate name prices:", prices[1], "tierThree", prices[3]);
        console.log("top tier:", prices[0]);
        return prices[duration];
    };

    // Duration selection handler with validation
    const selectDuration = (duration: 0 | 1 | 3) => {
        // Guard: Only allow 0, 1 or 3
        if (![0, 1, 3].includes(duration)) {
            console.error('Invalid duration selected');
            return;
        }

        setNameRegistration(prev => ({
            ...prev,
            duration,
            price: calculatePrice(duration)
        }));
    };

    // Check name availability (debounced)
    const _checkNamesAvailability = useCallback(
        debounce(async( name: string) => {
        if (!name || name.length < 3) {
            setNameRegistration(prev => ({...prev, isAvailable: null}));
            return;
        }
        setNameRegistration(prev => ({...prev, checkingAvailability: true}));

        try {
            // Calling name service smart contract check name available
            const isAvailable = await  checkNamesAvailability(name);
            console.log("checking availability", isAvailable);
            setNameRegistration(prev => ({
                ...prev,
                isAvailable,
                checkingAvailability: false
            }));
        } catch (error: any) {
            console.error('Failed to check availability', error);
            setNameRegistration(prev => ({
                ...prev,
                checkingAvailability: false,
                isAvailable: null
            }))
        }
    }, 500), [contracts?.nameService]);

    // handle name input
    const handleNameInput = (name: string) => {
        // Sanitize input (lowercase, alphanumeric only)
        
        const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        console.log("sanitzer::", sanitized);

        setNameRegistration(prev => ({
            ...prev,
            name: sanitized,
            isAvailable: null // Reset availabitity on change
        }));

        // Check availability after input
        _checkNamesAvailability(sanitized)
    }

    // Open registration modal 
    const openRegistrationModal = () => {
        setRegistrationMoal({
            isOpen: true,
            step: 'input'
        });
    };

    // Reset registration form
    const resetRegistrationForm = () => {
        setNameRegistration({
            name: '',
            duration: 1, // ✅ Valid default
            price: 100,
            isAvailable: null,
            checkingAvailability: false
        });
        setRegistrationMoal({
            isOpen: false,
            step: 'input'
        });
    };

    const handleRegisterName = useCallback(async () => {

        if (!address || !ethers.utils.isAddress(address)) {
            console.error(`invalid address:, ${address}`);
            setError('connect wallet first');
            return;
        };
        // Validation Guard
        if (!nameRegistration.name || nameRegistration.name.length < 3) {
            setError('Name must be at least 3 characters');
            return;
        }

        if (![0, 1, 3].includes(nameRegistration.duration)) {
            setError('Invalid duration selected');
            return;
        }

        if (nameRegistration.isAvailable === false) {
            setError('Name is not available');
            return;
        }
        
        try {
            setIsRegisteringName(true);
            setStatus('Registering name...');
            const tx = await registerNameService(nameRegistration.name, nameRegistration.duration);
            setStatus('');
            console.log("tx: wait()", tx);
        
        //    const txHash = (await tx.tx1.wait()).transactionHash.toString();
        //    console.log("name Result:", txHash);

        //    setUserNames(prevNames => [...prevNames, nameRegistration.name]);
            
            setNameState( `Successfully registered ${nameRegistration.name}!`);
            setStatus(`${nameRegistration.name} registeresd, reciept: `);
        //    toast.success(`receipt: ${txHash.toString()}`); 
            await getNameInfo(nameRegistration.name);

            // Reset the state after successful name registration
            resetRegistrationForm();

        } catch (error: any) {
            console.error('Failed to register name:', error);
            setError(`failed to register ${nameRegistration.name}, ${error}`)
            toast.error(`Registration failed: ${error.message}`);
        } finally {
            setIsRegisteringName(false);
        }
    }, [nameRegistration, contracts?.nameService]);

    const handleCheckNameAvail = useCallback(async() => {

        setIsSearching(true);

        if (!contracts?.nameService) {
            setIsSearching(false);
            return; 
        };

        try {
            const nameCheck =  await checkNamesAvailability(nameSearch);
            const nameResult = nameCheck === '0x0000000000000000000000000000000000000000000000000000000000000000' 
            ? false
            : true;

            console.log("name result", nameResult);
            console.log('nmae checked:!', nameCheck);

            setNameAvailability({
                rawResult: nameResult,
            });

            setNameSearch('');
            toast.success('name checked successfully');
            return nameResult;
            
        } catch (error: any) {
            console.error("failed to get name:", error);
            toast.error("failed to check name:", error.message);
            
            setNameAvailability({
                rawResult: null
            });
        } finally {
            setIsSearching(false);
        }

    }, [contracts?.nameService]);

    const handleRenewName = useCallback(async(name: string, duration: 1 | 3) => {
        
        if (!((await connectWallet()).account) || nameInfo?.isPermanent && nameInfo.isExpired) {
            throw new Error("not connected or name is Permanent or name is Expired");
        };

        try {
            setLoading(true);
            await getNameInfo(name);
            
            const baseTime = Date.now() > Number(nameInfo?.expirytime) ? Date.now() : nameInfo?.expirytime
            
            const results = await renewName(name, duration);

            console.log('renew Name tx', (await results.tx.wait()).transactionHash.toString());

            const txHash = (await results.tx.wait()).transactionHash.toString();

            // Close modal nad show success
            setRenewalModal({isOpen: false, nameToRenew: '', originalDuration: undefined});
            setStatus_RenewName(`✅ Successfully renewed ${name} for ${duration} year(s)!`);
            setStatusRenewName(txHash.toString());
            
            // Refresh name info
            await getNameInfo(name);
            const newExpiryTime = Number(baseTime) + Number(nameInfo?.expirytime);
            console.log("expiry time", newExpiryTime); 
            
        } catch (error: any) {
            console.error('failed to renew name', error);
            setErrorRenewName(error ? error.message : 'Failed to renew Name');
        } finally {
            setLoading(false);
        }
    }, [contracts?.nameService]);

    const handleNameInfo = useCallback(async(name: string) => { 
        if (!contracts?.nameService) return;
        try {
            await getNameInfo(name);
            console.log("name info retrieved:", nameInfo);
            console.log("isExpired:", nameInfo?.isExpired);
            console.log("fetched name info:", nameInfo);
            console.log("expiry time:", nameInfo?.expirytime);
            console.log("isPermanent:", nameInfo?.isPermanent);
        } catch (error: any) {
            console.error("failed to get name info:", error);
        }
    }, [contracts?.nameService, nameInfo]);

    const handleExpireName = useCallback(async(name: string) => {
        if (!contracts?.nameService && nameInfo?.isPermanent && !nameInfo?.isExpired) return;
        console.log("contracts provider:", contracts?.nameService.provider);
        console.log("nameInfo check:", nameInfo?.expirytime);
        setLoading(true);

        try {
            await expireName(name);
        } catch (error: any) {
            console.error("failed to expire name:", error);
            throw new Error("expire name failed", error.mesaage);
        }
        setLoading(false);
    }, [contracts?.nameService, nameInfo]);

    // Open renewal modal
    const openRenewalModal = (name: string, originalDuration?: number) => {
        
        setRenewalModal({
            isOpen: true,
            nameToRenew: name,
            originalDuration
        });
        // Set default to original duration if known
        setSelectedRenewalDuration((originalDuration === 3 ? 3 : 1) as 1 | 3)
    }
    
    // Memoize the availability check
    const memoizedNameCheck = useMemo(() => {
        if (!nameAvailablity.rawResult) return null;
        
        return nameAvailablity.rawResult ? <p>Name is Available</p> : <p>Name is Already Taken</p>
        
    }, [nameAvailablity]);

    const memoizedNameActivity = useMemo(() => {
     //   if (!nameInfo.isExpired) return;

        return nameInfo?.isExpired
        ? <p>Expired</p>
        : <p>Active</p>

    }, [nameInfo]);

     // Format a Unix timestamp to readable date
    const formatDate = (timestamp: number) => {
      // Multiply by 1000 to convert seconds to milliseconds for JS Date
      return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    console.log("Expiry time for name:", formatDate(Number(nameInfo?.expirytime)));
    console.log("number format:", (nameInfo?.expirytime))


    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl
            p-6 border border-purple-500/30">
                <div className="flex items-center mb-4">
                    <FileText className="mr-3 text-purple-400" size={24} />
                    <h3 className="text-xl font-bold text-white">Motel Name Service</h3> 
                </div>
                <p className="text-gray-300 text-sm">
                    Register and manage your .motel domain names for easy wallet
                    identifiaction and transfers.
                </p>
            </div>
            {/** Register Name #Registration button*/} 
            <button onClick={openRegistrationModal}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600
                hover:from-purple-700 hover:to-pink-700 text-white py-4 px-6
                rouned-lg transition-all rounded-b-xs font-bold text-lg flex items-center justify-center">
                    <Plus className="mr-2" size={20} />
                    Register New Name
                </button>
            {/**Registration Button */}
            {registrationModal.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex
                items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl
                    border border-purple-500/50 p-8 max-w-lg w-full shadow-2xl">
                        {/**Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white">Register Name</h3>
                            <button
                                onClick={resetRegistrationForm}
                                className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24}/>
                                </button>
                                </div>
                                {/**Step Indicator */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className={`flex items ${
                                        registrationModal.step === 'input' ? 'text-purple-400' : 'text-gray-500'
                                        }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                            border-2 ${registrationModal.step === 'input'
                                                ? 'border-purple-400 bg-purple-400/20'
                                                : 'border-gray-600'
                                                }`}>1
                                                </div>
                                                <span className="ml-2 text-sm font-medium">Name</span>
                                            </div>
                                                <div className="flex-1 h-0.5 bg-gray-700 mx-3"></div>
                                                <div className={`flex items-center ${
                                                    registrationModal.step === 'duration' 
                                                    ? 'text-purple-400'
                                                    : 'text-gray-500'
                                                    }`}>
                                                        <div className={`w-8 h-8 rounded-full flex items-center
                                                        justify-center border-2 ${
                                                            registrationModal.step === 'duration'
                                                            ? 'border-purple-400 bg-purple-400/20'
                                                            : 'border-gray-600'
                                                            }`}>2
                                                            </div>
                                                            <span className="ml-2 text-sm font-medium">Duration</span>
                                                        </div>
                                                        <div className="flex-1 h-0.5 bg-gray-700 mx-3"></div>
                                                        <div className={`flex items-center ${
                                                            registrationModal.step === 'confirm'
                                                            ? 'text-purple-400'
                                                            : 'text-gray-500'
                                                            }`}>
                                                                <div className={`w-8 h-8 rounded-full flex items-center
                                                                justify-center border-2 ${registrationModal.step === 'confirm'
                                                                    ? 'border-purple-400 bg-purple-400/20'
                                                                    : 'border-gray-600'
                                                                }`}>
                                                                    3
                                                                    </div>
                                                                <span className="ml-2 text-sm font-medium">Confirm</span>
                                                            </div>
                                                        </div>
                                                        {/** Step 1: Name Input */}
                                                        {registrationModal.step === 'input' && (
                                                            <div className="space-y-6">
                                                                <div>
                                                                    <label className="block text-gray-300 mb-2 font-medium">Choose Your Name</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            id="nameRegistration.name"
                                                                            value={nameRegistration.name}
                                                                            autoFocus
                                                                            onChange={(e) => handleNameInput(e.target.value)}
                                                                            placeholder="yourname"
                                                                            className="w-full bg-gray-800 text-white px-4 py-3
                                                                            rounded-lg border-2 border-gray-700 focus:border-purple-500
                                                                            focus:outline-none placeholder-gray-500 text-lg"
                                                                            />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">.motel</span>
                                                            </div>
                                                            {/** Availability Status */}
                                                            {nameRegistration.checkingAvailability && (
                                                                <div className="mt-2 flex items-center text-yellow-400 text-sm">
                                                                    <Loader2 className="animate-spin mr-2" size={14}/>
                                                                    Checking availability...
                                                            </div>
                                                        )}
                                                        {nameRegistration.isAvailable === true && (
                                                            <div className="mt-2 flex items-center text-green-400 text-sm">
                                                                <CheckCircle2 className="mr-2" size={14} />
                                                                Name is available
                                                            </div>
                                                        )}
                                                        {nameRegistration.isAvailable === false && (
                                                            <div className="mt-2 flex items-center text-red-400 text-sm">
                                                                <AlertCircle className="mr-2" size={14} />
                                                                Name is Alreay taken
                                                            </div>
                                                        )}
                                                </div>
                                                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                                                <p className="text-blue-300 text-sm">
                                                    💡 Name must be at least be 3 characters and only contain lowercase letters and numbers
                                                </p>
                                                </div>
                                                <button 
                                                    onClick={() => setRegistrationMoal(prev => ({
                                                        ...prev,
                                                        step: 'duration'
                                                    }))}
                                                    disabled={
                                                        !nameRegistration.name || 
                                                        nameRegistration.name.length < 3 || 
                                                        nameRegistration.isAvailable !== true
                                                    }
                                                    className="w-full bg-purple-600 hover:bg-purple-700
                                                    disabled:bg-gray-600 disabled:cursor-not-allowed
                                                    text-white py-3 px-6 rounded-lg transition-all font-bold">
                                                        Continue to Duration
                                                    </button>
                                            </div>
                                        )}
                                        {/** Step 2: Duration selection (GUARDED) */}
                                        {registrationModal.step === 'duration' && (
                                            <div className="space-y-4">
                                                <p className="text-gray-300 mb-4">
                                                    Registering: <span className="text-white font-bold">
                                                        {nameRegistration.name}.motel
                                                    </span>
                                                </p>
                                                <label className="block text-gray-300 mb-3 font-medium">
                                                    Choose Registration Period:
                                                </label>
                                                <div className="space-y-3">
                                                    {/**1 Year Option */}
                                                    <button
                                                        onClick={() => selectDuration(1)}
                                                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                                                            nameRegistration.duration === 1
                                                            ? 'border-purple-500 bg-purple-900/40'
                                                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                                        }`}>
                                                            <div className="flex items-center justify-between">
                                                                <div className="text-left">
                                                                    <p className="text-white font-semibold">1 Year</p>
                                                                    <p className="text-gray-400 text-sm">Standard registration</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-white font-bold">{pricing 
                                                                    ? formatEther(BigInt(pricing.oneYear)) 
                                                                    : 'N/A'} AVAX</p>
                                                                    {nameRegistration.duration === 1 && (
                                                                        <CheckCircle2 className="text-purple-400 ml-2 inline"/>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                        {/**3 Year Option */}
                                                        <button
                                                            onClick={() => selectDuration(3)}
                                                            className={`w-full p-4 rounded-lg border-2 transition-all ${
                                                                nameRegistration.duration === 3
                                                                ? 'border-purple-500 bg-purple-900/40'
                                                                : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="text-left">
                                                                        <p className="text-white font-semibold">3 Years</p>
                                                                        <p className="text-green-400 text-sm">Save 15% 🎉</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-white font-bold">{pricing 
                                                                            ? formatEther(BigInt(pricing.threeYear))
                                                                            : formatEther(BigInt(defaultPricing.threeYear))} AVAX</p>
                                                                        <p className="text-gray-400 text-xs line-through">{pricing 
                                                                            ? formatEther(BigInt(pricing.threeYear) + BigInt(55000000000000000))
                                                                            : 'N/A'} AVAX
                                                                        </p>
                                                                        {nameRegistration.duration === 3 && (
                                                                            <CheckCircle2 className="text-purple-400 ml-2 inline" size={20}/>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                            {/** Permanent Option */}
                                                            <button 
                                                                onClick={() => selectDuration(0)}
                                                                className={`w-full p-4 rounded-lg border-2
                                                                transition-all ${
                                                                    nameRegistration.duration === 0
                                                                    ? 'border-purple-500 bg-purple-900/40'
                                                                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                                                }`}>
                                                                   <div className="flex items-center justify-between">
                                                                    <div className="text-left">
                                                                        <p className="text-white font-semibold flex items-center">
                                                                            permanent
                                                                        <span className="ml-2 text-xs bg-yellow-500/20
                                                                        text-yellow-400 px-2 py-0.5
                                                                        rounded">PREMIUM</span>
                                                                    </p>
                                                                    <p className="text-yellow-400 text-sm">Own it forever ♾️</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-white font-bold">{pricing 
                                                                            ? formatEther(BigInt(pricing.permanent))
                                                                            : formatEther(BigInt(defaultPricing.permanent))} AVAX
                                                                        </p>
                                                                        {nameRegistration.duration === 0 && (
                                                                            <CheckCircle2 className="text-purple-400 ml-2 inline" size={20}/>
                                                                        )}
                                                                    </div>
                                                                    </div> 
                                                                </button>
                                                </div>
                                                <div className="flex gap-3 mt-6">
                                                    <button
                                                        onClick={() => setRegistrationMoal(prev => ({
                                                            ...prev,
                                                            step: 'input'
                                                        }))}
                                                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white
                                                        py-3 px-6 rounded-lg transition-all font-medium">
                                                            Back
                                                        </button>
                                                        <button 
                                                            onClick={() => setRegistrationMoal(prev => ({
                                                                ...prev,
                                                                step: 'confirm'
                                                            }))}
                                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white
                                                            py-3 px-6 rounded-lg transition-all font-bold">
                                                                Continue
                                                            </button>
                                                </div>
                                            </div>
                                        )}
                                        {/** Step 3: Confirmation */}
                                        {registrationModal.step === 'confirm' && (
                                            <div className="space-y-6">
                                                <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                                                        <span className="text-gray-400">Name:</span>
                                                        <span className="text-white font-bold text-lg">
                                                            {nameRegistration.name}.motel
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                                                        <span className="text-gray-400">Duration</span>
                                                        <span className="text-white font-semibold">
                                                            {nameRegistration.duration === 0 
                                                            ? 'Permanent'
                                                            : `${nameRegistration.duration} Year${
                                                                nameRegistration.duration > 1 
                                                                ? 's'
                                                                : ''
                                                            }`}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify items-center pt-2">
                                                        <span className="text-gray-300 text-lg">Total:</span>
                                                        <span className="text-white font-bold text-2xl">
                                                            {formatEther(BigInt(nameRegistration.price))}AVAX
                                                        </span>
                                                    </div>
                                                </div>
                                                {status && (
                                                    <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
                                                        <p className="text-blue-300 text-sm">{status}</p>
                                                    </div>
                                                )}
                                                {error && (
                                                    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
                                                        <p className="text-red-300 text-sm">{error}</p>
                                                    </div>
                                                )}
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => setRegistrationMoal(prev => ({
                                                            ...prev,
                                                            step: 'duration'
                                                        }))}
                                                        disabled={isRegisteringName}
                                                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800
                                                        text-white py-3 px-6 rounded-lg transition-all font-medium">
                                                            Back
                                                        </button>
                                                        <button
                                                            onClick={handleRegisterName}
                                                            disabled={isRegisteringName}
                                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600
                                                            hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600
                                                            disabled:to-gray-600 text-white py-3 px-6 rounded-lg
                                                            transition-all font-bold flex items-center justify-center">
                                                                {isRegisteringName ? (
                                                                    <>
                                                                    <Loader2 className="animate-spin mr-2" size={20} />
                                                                    Registering...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                    <Key className="mr-2" size={20} />
                                                                    Register Name
                                                                    </>
                                                                )}
                                                            </button>
                                                            <p className="text-gray-400 text-xs text-center">
                                                                Transaction will require wallet confirmation
                                                            </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                )}

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
                      <button onClick={handleCheckNameAvail} disabled={!nameSearch || isSearching}
                        className={`w-full 
                        py-3 px-4 rounded-lg transition-all duration-300 font-medium ${!nameSearch || isSearching
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed items-center'
                            : 'bg-blue-600/60 hover:bg-blue-700 text-white flex items-center justify-center gap-2'
                        }`}>
                            {isSearching ?
                            <>
                            <Loader2 className="animate-spin" size={18}/>
                            <span>Checking...</span>
                            </> 
                            : 'Check Name Availability'}
                    </button>
                </div>
            </div>

            {/** Your Name */}
            {userNames && userNames.length > 0 && (
                <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-xl 
                p-6 border border-gray-600">
                    <h3 className="text-xl font-bold text-white mb-4">Your Registered Names</h3>
                    <div className="space-y-3">
                        {userNames.map((name, idx) => {
                            const details = nameDetails.get(name);
                            const expiryDate = details?.expiryTime
                                ? formatDate(Number(details.expiryTime))
                                : 'Loading...';
                            const isExpired = details?.isExpired ?? false;
                            return (
                                <div key={idx} className="bg-gray-800 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-white font-medium font-mono">{name}</span>
                                        <span className={`text-sm px-2 py-1 rounded ${
                                            isExpired
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-green-500/20 text-green-400'
                                        }`}>
                                            {isExpired ? 'Expired' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => openRenewalModal(name, duration)}
                                                disabled={isExpired}
                                                className="flex-1 bg-purple hover:bg-purple-700 disabled:bg-gray-700
                                                disabled:cursor-not-allowed text-white py-2 px-3 rounded text-sm 
                                                transition-colors">
                                                    Renew
                                            </button>
                                            <button
                                                onClick={() => handleExpireName(name)}
                                                className="flex-1 bg-orange-600 hover:bg-orange-700 trext-white
                                                py-2 px-3 rounded text-sm transition-colors">
                                                    Expire
                                            </button>
                                    </div>
                                    <p className="text-gray-400 text-xs">
                                        {isExpired ? 'Expired on:' : 'Expires on:'} {expiryDate}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {userNames && userNames.length === 0 && (
                <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700
                text-center">
                    <p className="text-gray-400 mb-4">You don't have any registered Names yet</p>
                    <button onClick={openRegistrationModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 
                    rounded-lg transition-colors font-medium">
                        Register your first name
                    </button>
                </div>
            )}

            {renewalModal.isOpen && (
                <div className="fixed inset-0 bg-black/70 
                backdrop-blur-sm flex items-center">
                    <div className="bg-gradient-to-br from-gray-900
                    to-gray-800 rounded-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white">Renew Name</h3>
                            <button
                                onClick={() => setRenewalModal({isOpen: false,
                                    nameToRenew: '',
                                    originalDuration: undefined
                                })}
                                className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                            </button>
                            
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-300 mb-2">Renewing:</p>
                            <div className="bg-purple-900/30 border-purple-500/30
                            rounded-lg p-3">
                                <p className="text-white font-mono font-semibold">
                                    {renewalModal.nameToRenew}
                                </p>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-300 mb-3 font-medium">
                                Choose Renewal Period:
                            </label>
                            <div className="space-y-3">
                                {/** 1 year Option */}
                                <button
                                    onClick={() => setSelectedRenewalDuration(1)}
                                    className={`w-full p-4 rounded-lg border-2 transition-all
                                    ${
                                        selectedRenewalDuration === 1
                                        ? 'border-purple-500 bg-gray-800/50'
                                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="text-left">
                                                <p className="text-white font-semibold">1</p>
                                                <p className="text-gray-400 text-sm">Standard renewal</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">{pricing?.oneYear ? formatEther(BigInt(pricing.oneYear)) : 'N/A'} AVAX</p>
                                                {selectedRenewalDuration === 1 && (
                                                    <CheckCircle2 className="text-purple-400 ml-2 inline" size={20}/>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                    {/**3 year option */}
                                    <button
                                        onClick={() => setSelectedRenewalDuration(3)}
                                        className={`w-full p-4 rounded-lg border-2 transition-all 
                                        ${
                                            selectedRenewalDuration === 3
                                            ? 'border-purple-500 bg-purple-900/40'
                                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <p className="text-green-400 text-sm">15% off🎉</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-white font-bold">{pricing?.threeYear 
                                                    ? formatEther(BigInt(pricing.threeYear)) : 'N/A'}AVAX</p>
                                                    <p className="text-gray text-xs line-through">{pricing?.threeYear 
                                                    ? formatEther(BigInt(pricing.threeYear) + BigInt(55000000000000000)) : 'N/A'}AVAX</p>
                                                    {selectedRenewalDuration === 3 && (
                                                        <CheckCircle2 className="text-purple-400 ml-2 inline" size={20}/>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                            </div>
                        </div>
                        {renewalModal.originalDuration && (
                            <p className="text-purple-300 text-sm mb-4 flex items-center">
                                <AlertCircle size={14} className="mr-1"/>
                                Originally registered for {renewalModal.originalDuration} year(s)
                            </p>
                        )}
                        <button 
                            onClick={() => handleRenewName(
                                renewalModal.nameToRenew, selectedRenewalDuration)}
                                disabled={loading || !isConnected}
                                className="w-full  from-purple-600 to-pink-600
                                hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600
                                disabled:to-gray-600 text-white py-4 px-6 rounded-lg
                                transition-all font-bold text-lg flex items-center justify-center">
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" size={20}/>
                                        </>
                                    ) : (
                                        <>
                                            Renew for {selectedRenewalDuration} Year{selectedRenewalDuration > 1 ? 's' : ''}
                                        </>
                                    )}
                                </button>
                                <p className="text-gray-400 text-xs text-center mt-4">
                                    Transaction will require wallet confirmation
                                </p>
                    </div>
                </div>
            )}
            
            {/** Name Info */}
            <div className="bg-linear-to-br from-gray-900 to-gray-800
            rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Name information</h3>

                <div className="bg-gray-800 rounded-lg p-4">
                    {nameSearch}{nameAvailablity.rawResult ? (
                        <div className={`
                            rounded-lg p-4 mt-4
                            ${nameAvailablity.rawResult
                                ? 'bg-green-900 text-green-300'
                                : 'bg-red-900 text-red-300'
                            }`}>{memoizedNameCheck}</div>
                    ) : (
                        <p className="text-gray-400 text-sm">Select a name or search to view details</p>
                    )}
                    {nameState && (
                        <div className="mb-2 bg-blue-900/30 border border-blue-500/50 p-1 rounded-lg">
                            <p className="text-blue-300">{nameState}</p>
                        </div>
                    )}
                    {nameInfo && (
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Owner:</span>
                                <span className="text-white font-mono text-sm">{nameInfo.owner}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Permanent:</span>
                                <span className={`font-semibold ${nameInfo.isPermanent ? 'text-green-400' : 'text-red-400'}`}>
                                    {nameInfo.isPermanent ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Expired:</span>
                                <span className={`font-semibold ${nameInfo.isExpired ? 'text-red-400' : 'text-green-400'}`}>
                                    {nameInfo.isExpired ? 'Yes' : 'No'}
                                </span>
                            </div>
                            {!nameInfo.isPermanent && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Expiry Date:</span>
                                    <span className="text-white font-mono text-sm">
                                        {nameInfo?.expirytime ?
                                        formatDate(Number(nameInfo.expirytime))
                                        : 'N/A'}
                                    </span>
                                </div>
                            )}

                            {ownerNamesList.length > 1 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowOwnerNames(prev => !prev)}
                                        className="text-sm text-purple-300 hover:underline"
                                    >
                                        {showOwnerNames ? 'Hide' : `Show all names for owner (${ownerNamesList.length})`}
                                    </button>

                                    {showOwnerNames && (
                                        <div className="mt-2 space-y-2 bg-gray-900 rounded p-2">
                                            {ownerNamesList.map((n: any) => (
                                                <div key={n.name} className={`flex items-center justify-between p-2 rounded hover:bg-gray-800 cursor-pointer ${selectedOwnerName === n.name ? 'border border-purple-500' : 'border border-transparent'}`}
                                                    onClick={async () => { setSelectedOwnerName(n.name); await handleNameInfo(n.name); }}
                                                >
                                                    <div>
                                                        <div className="text-white font-semibold">{n.name}.motel</div>
                                                        <div className="text-gray-400 text-xs">
                                                            {n.isPermanent ? 'Permanent' : (n.isExpired ? 'Expired' : 'Active')}
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-gray-300 text-xs">
                                                        {!n.isPermanent && n.expirytime ? formatDate(Number(n.expirytime)) : '--'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
}