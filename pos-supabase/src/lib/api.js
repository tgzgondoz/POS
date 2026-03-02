import { supabase } from './supabase';

// Products API
export const productsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          name
        )
      `)
      .order('name');
    
    if (error) throw error;
    
    return data.map(product => ({
      ...product,
      category_name: product.categories?.name,
      price: parseFloat(product.price)
    }));
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          name
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return {
      ...data,
      category_name: data.categories?.name,
      price: parseFloat(data.price)
    };
  },

  create: async (productData) => {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id, productData) => {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

// Orders API
export const ordersApi = {
  getAll: async () => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:user_id (
          name,
          username
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return orders.map(order => ({
      ...order,
      user_name: order.users?.name,
      total_amount: parseFloat(order.total_amount)
    }));
  },

  getById: async (id) => {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        users:user_id (
          name,
          username
        )
      `)
      .eq('id', id)
      .single();
    
    if (orderError) throw orderError;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products:product_id (
          name
        )
      `)
      .eq('order_id', id);
    
    if (itemsError) throw itemsError;

    return {
      order: {
        ...order,
        user_name: order.users?.name,
        total_amount: parseFloat(order.total_amount)
      },
      items: items.map(item => ({
        ...item,
        product_name: item.products?.name,
        price: parseFloat(item.price)
      }))
    };
  },

  create: async (orderData) => {
    const { items, ...orderInfo } = orderData;
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderInfo])
      .select()
      .single();
    
    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;

    for (const item of items) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        product_id: item.product_id,
        quantity: item.quantity
      });
      
      if (stockError) throw stockError;
    }

    return order;
  }
};

// Users API
export const usersApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  create: async (userData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.username,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role
        }
      }
    });

    if (authError) throw authError;

    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        username: userData.username,
        name: userData.name,
        role: userData.role
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id, userData) => {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: userData.name,
        role: userData.role
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};