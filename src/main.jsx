import React,{useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import {collection,getDocs} from 'firebase/firestore';
import {db,auth} from './firebase';
import {onAuthStateChanged,signOut} from 'firebase/auth';
import Admin from './Admin';
import Auth from './Auth';
import Wishlist from './Wishlist';
import Checkout from './Checkout';
import Orders from './Orders';
import Returns from './Returns';
import {ShoppingCart,Search,Heart,Star,ArrowRight,Menu,X,Plus,Minus,Trash2,User,LogOut,Package,SlidersHorizontal,RotateCcw} from 'lucide-react';
import {Toaster,toast} from 'react-hot-toast';
import './index.css';
import './account-hover.css';
import './catalog-filters.css';
// The rest of the existing application remains unchanged.
