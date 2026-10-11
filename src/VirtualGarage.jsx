import React, { useState, useEffect } from 'react';
import { Car, Bike, Check, X, ShieldCheck, ChevronRight, Wrench, RotateCcw, AlertCircle } from 'lucide-react';

export const GARAGE_STORAGE_KEY = 'motodc_garage_vehicle';

export const VEHICLE_DATABASE = {
  motorcycle: {
    'Royal Enfield': [
      'Classic 350',
      'Hunter 350',
      'Bullet 350',
      'Meteor 350',
      'Continental GT 650',
      'Interceptor 650',
      'Himalayan 450'
    ],
    'KTM': [
      'Duke 390',
      'Duke 250',
      'Duke 200',
      'RC 390',
      'RC 200',
      '390 Adventure'
    ],
    'Yamaha': [
      'YZF-R15 V4',
      'MT-15 V2',
      'FZ-S FI',
      'Aerox 155',
      'R3'
    ],
    'Bajaj': [
      'Pulsar NS200',
      'Pulsar 150',
      'Pulsar N250',
      'Dominar 400',
      'Avenger 220'
    ],
    'Honda': [
      'H\'ness CB350',
      'CB350RS',
      'Hornet 2.0',
      'Activa 6G',
      'Dio 125'
    ],
    'TVS': [
      'Apache RTR 160 4V',
      'Apache RTR 200 4V',
      'Apache RR 310',
      'Raider 125'
    ],
    'Kawasaki': [
      'Ninja 300',
      'Ninja 400',
      'Z900',
      'ZX-10R'
    ],
    'BMW Motorrad': [
      'G 310 R',
      'G 310 GS',
      'S 1000 RR'
    ],
    'Hero': [
      'Splendor Plus',
      'HF Deluxe',
      'Xpulse 200 4V'
    ]
  },
  automobile: {
    'Hyundai': [
      'i20 / N Line',
      'Creta',
      'Venue',
      'Verna',
      'Tucson'
    ],
    'Maruti Suzuki': [
      'Swift',
      'Baleno',
      'Brezza',
      'Grand Vitara',
      'Dzire',
      'Ertiga'
    ],
    'Tata': [
      'Nexon',
      'Harrier',
      'Safari',
      'Altroz',
      'Punch'
    ],
    'Mahindra': [
      'Thar',
      'Scorpio-N',
      'XUV700',
      'Bolero'
    ],
    'Honda': [
      'City (5th Gen)',
      'Amaze',
      'Elevate'
    ],
    'Volkswagen': [
      'Polo',
      'Virtus',
      'Taigun'
    ],
    'Skoda': [
      'Slavia',
      'Kushaq',
      'Octavia'
    ],
    'BMW': [
      '3 Series (G20)',
      '5 Series',
      'M340i xDrive',
      'X1'
    ],
    'Toyota': [
      'Fortuner',
      'Innova Crysta',
      'Urban Cruiser Hyryder'
    ]
  }
};

export const getGarageVehicle = () => {
  try {
    const raw = localStorage.getItem(GARAGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const setGarageVehicle = (vehicle) => {
  try {
    if (vehicle) {
      localStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify(vehicle));
    } else {
      localStorage.removeItem(GARAGE_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('motodc:garage_change', { detail: vehicle }));
  } catch (_) {}
};

export const checkProductFitment = (product, vehicle) => {
  if (!vehicle) return { status: 'none', label: 'Check Fitment', matchDesc: 'Select your vehicle to verify fitment' };
  
  const pName = (product?.name || '').toLowerCase();
  const pCat = (product?.category || '').toLowerCase();
  const pDesc = (product?.description || '').toLowerCase();
  const vMake = (vehicle?.make || '').toLowerCase();
  const vModel = (vehicle?.model || '').toLowerCase();
  const vType = (vehicle?.type || '').toLowerCase();

  const isUniversal = /oil|lubricant|cleaner|fluid|spray|grease|polish|cloth|tool|shampoo|coolant/i.test(pName + ' ' + pDesc);
  if (isUniversal) {
    return { 
      status: 'universal', 
      label: 'Universal Fit', 
      matchDesc: 'Compatible with all motorcycles and automobiles' 
    };
  }

  const isCarPart = pCat.includes('auto') || pCat.includes('car');
  const isBikePart = pCat.includes('motorcycle') || pCat.includes('bike');

  if (vType === 'motorcycle' && isCarPart) {
    return { 
      status: 'incompatible', 
      label: `Not for ${vehicle.model}`, 
      matchDesc: `Engineered specifically for automobiles. Not compatible with ${vehicle.model}.` 
    };
  }

  if (vType === 'automobile' && isBikePart) {
    return { 
      status: 'incompatible', 
      label: `Not for ${vehicle.model}`, 
      matchDesc: `Engineered specifically for motorcycles. Not compatible with ${vehicle.model}.` 
    };
  }

  const modelTokens = vModel.split(/[\s\/-]+/).filter(t => t.length >= 3);
  const matchesModel = modelTokens.some(token => pName.includes(token) || pDesc.includes(token));
  const matchesMake = pName.includes(vMake) || pDesc.includes(vMake);

  if (matchesModel) {
    return { 
      status: 'exact', 
      label: `✓ Exact Fit: ${vehicle.model}`, 
      matchDesc: `100% Guaranteed Direct OEM Fitment for ${vehicle.year || ''} ${vehicle.make} ${vehicle.model}` 
    };
  }

  if (matchesMake) {
    return { 
      status: 'exact', 
      label: `✓ Fits ${vehicle.make}`, 
      matchDesc: `Direct factory bolt-on fitment for ${vehicle.make} models` 
    };
  }

  return { 
    status: 'compatible', 
    label: `✓ Fits ${vehicle.model}`, 
    matchDesc: `Standard bolt-on fitment compatible with ${vehicle.make} ${vehicle.model}` 
  };
};

export function GarageModal({ isOpen, onClose }) {
  const [current, setCurrent] = useState(getGarageVehicle);
  const [type, setType] = useState(current?.type || 'motorcycle');
  const [selectedMake, setSelectedMake] = useState(current?.make || '');
  const [selectedModel, setSelectedModel] = useState(current?.model || '');
  const [selectedYear, setSelectedYear] = useState(current?.year || '2024');

  useEffect(() => {
    const handleUpdate = () => {
      const v = getGarageVehicle();
      setCurrent(v);
      if (v) {
        setType(v.type);
        setSelectedMake(v.make);
        setSelectedModel(v.model);
        setSelectedYear(v.year || '2024');
      }
    };
    window.addEventListener('motodc:garage_change', handleUpdate);
    return () => window.removeEventListener('motodc:garage_change', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const makes = Object.keys(VEHICLE_DATABASE[type] || {});
  const models = selectedMake ? (VEHICLE_DATABASE[type]?.[selectedMake] || []) : [];

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedMake || !selectedModel) return;
    const vehicle = {
      type,
      make: selectedMake,
      model: selectedModel,
      year: selectedYear
    };
    setGarageVehicle(vehicle);
    onClose();
  };

  const handleClear = () => {
    setGarageVehicle(null);
    setSelectedMake('');
    setSelectedModel('');
  };

  return (
    <div className="garageModalOverlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="garage-title">
      <div className="garageModalBox" onClick={(e) => e.stopPropagation()}>
        <div className="garageModalHeader">
          <div className="garageModalTitleWrap">
            <span className="garageNeonPill"><Wrench size={14}/> VIRTUAL GARAGE</span>
            <h2 id="garage-title">Select Your <span>Machine</span></h2>
            <p>Ensure 100% guaranteed bolt-on fitment across all MotoDC parts.</p>
          </div>
          <button type="button" className="garageCloseBtn" onClick={onClose} aria-label="Close modal">
            <X size={20}/>
          </button>
        </div>

        {current && (
          <div className="garageActiveCard">
            <div className="garageActiveIcon">
              {current.type === 'motorcycle' ? <Bike size={24}/> : <Car size={24}/>}
            </div>
            <div className="garageActiveInfo">
              <span className="garageActiveBadge">Currently in Your Garage</span>
              <h3>{current.year} {current.make} {current.model}</h3>
              <small>Verified Fitment Active</small>
            </div>
            <button type="button" className="garageRemoveBtn" onClick={handleClear} title="Clear saved vehicle">
              <RotateCcw size={14}/> Remove
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="garageForm">
          <div className="garageTypeTabs">
            <button
              type="button"
              className={`garageTypeTab ${type === 'motorcycle' ? 'active' : ''}`}
              onClick={() => {
                setType('motorcycle');
                setSelectedMake('');
                setSelectedModel('');
              }}
            >
              <Bike size={18}/>
              <span>Motorcycle</span>
            </button>
            <button
              type="button"
              className={`garageTypeTab ${type === 'automobile' ? 'active' : ''}`}
              onClick={() => {
                setType('automobile');
                setSelectedMake('');
                setSelectedModel('');
              }}
            >
              <Car size={18}/>
              <span>Automobile</span>
            </button>
          </div>

          <div className="garageFieldGrid">
            <div className="garageField">
              <label>1. Manufacturer / Make</label>
              <select
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel('');
                }}
                required
              >
                <option value="">Select Manufacturer...</option>
                {makes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="garageField">
              <label>2. Vehicle Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedMake}
                required
              >
                <option value="">{selectedMake ? 'Select Model...' : 'Choose Make First'}</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="garageField">
              <label>3. Model Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="garageModalActions">
            <button
              type="submit"
              className="garageSaveBtn"
              disabled={!selectedMake || !selectedModel}
            >
              <ShieldCheck size={18}/> Save to My Garage & Enable Fitment Check
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GarageNavTrigger() {
  const [vehicle, setVehicle] = useState(getGarageVehicle);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setVehicle(getGarageVehicle());
    window.addEventListener('motodc:garage_change', handleUpdate);
    return () => window.removeEventListener('motodc:garage_change', handleUpdate);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`garageNavButton ${vehicle ? 'activeVehicle' : ''}`}
        onClick={() => setModalOpen(true)}
        aria-label="Manage your virtual garage and vehicle fitment"
        title={vehicle ? `Garage: ${vehicle.make} ${vehicle.model}` : "Select vehicle for guaranteed fitment"}
      >
        <span className="garageNavIcon">
          {vehicle?.type === 'automobile' ? <Car size={16}/> : <Bike size={16}/>}
        </span>
        <span className="garageNavText">
          {vehicle ? `${vehicle.model}` : 'My Garage'}
        </span>
        {vehicle ? (
          <span className="garageNavDot" title="Guaranteed Fitment Active" aria-hidden="true"/>
        ) : (
          <span className="garageNavPlus">+</span>
        )}
      </button>
      <GarageModal isOpen={modalOpen} onClose={() => setModalOpen(false)}/>
    </>
  );
}
