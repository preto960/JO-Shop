import React, {createContext, useContext, useReducer, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_KEY = '@joshop_cart';

const CartContext = createContext(null);

// Tipos de acciones
const ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART',
  RESTORE_CART: 'RESTORE_CART',
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.ADD_ITEM: {
      const existingIndex = state.items.findIndex(
        item => item.id === action.payload.id,
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + (action.payload.quantity || 1),
        };
        return {...state, items: newItems};
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            ...action.payload,
            quantity: action.payload.quantity || 1,
          },
        ],
      };
    }

    case ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };

    case ACTIONS.UPDATE_QUANTITY: {
      const {id, quantity} = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== id),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === id ? {...item, quantity} : item,
        ),
      };
    }

    case ACTIONS.CLEAR_CART:
      return {...state, items: []};

    case ACTIONS.LOAD_CART:
      return {...state, isLoading: false};

    case ACTIONS.RESTORE_CART:
      return {...state, items: action.payload, isLoading: false};

    default:
      return state;
  }
};

// Estado inicial
const initialState = {
  items: [],
  isLoading: true,
};

// Cálculos derivados
const useCartCalculations = items => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return {totalItems, totalPrice};
};

// Provider
export const CartProvider = ({children}) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Cargar carrito desde AsyncStorage al iniciar
  React.useEffect(() => {
    const loadCart = async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          dispatch({type: ACTIONS.RESTORE_CART, payload: parsed});
        } else {
          dispatch({type: ACTIONS.LOAD_CART});
        }
      } catch {
        dispatch({type: ACTIONS.LOAD_CART});
      }
    };
    loadCart();
  }, []);

  // Guardar carrito en AsyncStorage cuando cambie
  React.useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(CART_KEY, JSON.stringify(state.items)).catch(() => {});
    }
  }, [state.items, state.isLoading]);

  const addItem = useCallback(product => {
    dispatch({type: ACTIONS.ADD_ITEM, payload: product});
  }, []);

  const removeItem = useCallback(productId => {
    dispatch({type: ACTIONS.REMOVE_ITEM, payload: productId});
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    dispatch({
      type: ACTIONS.UPDATE_QUANTITY,
      payload: {id: productId, quantity},
    });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({type: ACTIONS.CLEAR_CART});
  }, []);

  const {totalItems, totalPrice} = useCartCalculations(state.items);

  const value = {
    items: state.items,
    isLoading: state.isLoading,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Hook personalizado
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
};

export default CartContext;
