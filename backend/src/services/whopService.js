import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID || 'biz_7hs7GneaLhaFT5';
const WHOP_BASE_URL = 'https://api.whop.com/api/v1';

// Priority product IDs (for ordering)
const PRIORITY_PRODUCTS = {
  BLUEPRINT_PLUS: 'prod_lb9a1dpjmRkz8',
  BLUEPRINT_STANDARD: 'prod_XDKI8nmaP2ah9',
  DEPOSIT_PAYMENT_LINKS: 'prod_bqc3Pdc9iolas'
};

// Product display name overrides
const PRODUCT_DISPLAY_NAMES = {
  'prod_lb9a1dpjmRkz8': "TJR's Daytrading Blueprint+",
  'prod_XDKI8nmaP2ah9': "TJR's Blueprint (Standard)",
  'prod_bqc3Pdc9iolas': 'Deposit Payment Links'
};

const whopClient = axios.create({
  baseURL: WHOP_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Authorization': `Bearer ${WHOP_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Helper to delay between API calls to avoid rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cache for closer links (5 minute TTL)
let linksCache = null;
let linksCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Parse internal_notes and plan data to extract closer email and generate dynamic label
function parseInternalNotes(notes, initialPrice, renewalPrice, planType) {
  if (!notes) return null;

  // Skip non-closer entries
  if (notes.includes('Release') || notes.includes('SMC Simplified')) {
    return null;
  }

  // Extract email and prefix pattern
  const patterns = [
    { regex: /^pif-(.+@.+)$/i, prefix: 'pif' },
    { regex: /^split1k-(.+@.+)$/i, prefix: 'split1k' },
    { regex: /^split2k-(.+@.+)$/i, prefix: 'split2k' },
    { regex: /^splitlk-(.+@.+)$/i, prefix: 'splitlk' },
    { regex: /^split3500-(.+@.+)$/i, prefix: 'split3500' },
    { regex: /^split-(.+@.+)$/i, prefix: 'split' },
    { regex: /^deposit500-(.+@.+)$/i, prefix: 'deposit500' },
    { regex: /^deposit-(.+@.+)$/i, prefix: 'deposit' },
    { regex: /^psplit-(.+@.+)$/i, prefix: 'psplit' },
    { regex: /^PSPLIT-(.+@.+)$/i, prefix: 'psplit' },
    // Simple email format (no prefix)
    { regex: /^([a-z0-9-]+@tjr-trades\.com)$/i, prefix: 'other' }
  ];

  let email = null;
  let prefix = null;

  for (const pattern of patterns) {
    const match = notes.match(pattern.regex);
    if (match) {
      email = match[1].toLowerCase();
      prefix = pattern.prefix;
      break;
    }
  }

  if (!email) return null;

  // Generate label based on prefix and price
  let type = prefix;
  let typeLabel = 'Other';

  if (prefix === 'pif') {
    // PIF - label based on initial price
    if (initialPrice === 7000) {
      typeLabel = '7K PIF';
      type = 'pif7k';
    } else if (initialPrice === 5000) {
      typeLabel = '5K PIF';
      type = 'pif5k';
    } else {
      typeLabel = `${initialPrice / 1000}K PIF`;
      type = `pif${initialPrice}`;
    }
  } else if (prefix === 'split1k' || prefix === 'splitlk') {
    typeLabel = 'SPLIT $1K';
    type = 'split1k';
  } else if (prefix === 'split2k') {
    typeLabel = 'SPLIT $2K';
    type = 'split2k';
  } else if (prefix === 'split3500') {
    typeLabel = '3500 SPLIT';
    type = 'split3500';
  } else if (prefix === 'split') {
    typeLabel = 'SPLIT';
    type = 'split';
  } else if (prefix === 'deposit500') {
    typeLabel = 'DEPOSIT $500';
    type = 'deposit500';
  } else if (prefix === 'deposit') {
    typeLabel = 'DEPOSIT $250';
    type = 'deposit';
  } else if (prefix === 'psplit') {
    typeLabel = 'P-SPLIT';
    type = 'psplit';
  }

  return {
    email: email,
    type: type,
    typeLabel: typeLabel
  };
}

// Fetch all products from Whop
async function getAllProducts() {
  try {
    const response = await whopClient.get('/products', {
      params: { company_id: WHOP_COMPANY_ID }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('[Whop] Error fetching products:', error.response?.data || error.message);
    throw error;
  }
}

// Get all closer links from a product
async function getCloserLinksForProduct(productId, productName) {
  try {
    const links = [];
    let hasMore = true;
    let cursor = null;
    let pageCount = 0;

    while (hasMore) {
      const params = {
        company_id: WHOP_COMPANY_ID,
        product_id: productId,
        first: 100
      };

      if (cursor) {
        params.after = cursor;
      }

      // Add delay between pagination requests
      if (pageCount > 0) {
        await delay(300);
      }

      const response = await whopClient.get('/plans', { params });
      const data = response.data;
      pageCount++;

      for (const plan of data.data || []) {
        // CRITICAL: Only include plans that actually belong to this product
        // Whop API sometimes returns plans from other products
        if (plan.product?.id !== productId) {
          continue;
        }
        
        const parsed = parseInternalNotes(
          plan.internal_notes,
          plan.initial_price,
          plan.renewal_price,
          plan.plan_type
        );
        if (parsed) {
          links.push({
            id: plan.id,
            closerEmail: parsed.email,
            linkType: parsed.type,
            linkTypeLabel: parsed.typeLabel,
            price: plan.initial_price,
            memberCount: plan.member_count,
            checkoutUrl: plan.purchase_url || `https://whop.com/checkout/${plan.id}`,
            productId: productId,
            productName: productName,
            createdAt: plan.created_at,
            internalNotes: plan.internal_notes
          });
        }
      }

      hasMore = data.page_info?.has_next_page || false;
      cursor = data.page_info?.end_cursor || null;
    }

    return links;
  } catch (error) {
    console.error(`[Whop] Error fetching plans for product ${productId}:`, error.response?.data || error.message);
    return []; // Return empty array instead of throwing to continue with other products
  }
}

// Get all closer links from all products, grouped by product
export async function getCloserLinksGroupedByProduct() {
  try {
    console.log('[Whop] Fetching closer links and grouping by product...');

    // Only fetch from priority products for speed (Blueprint+, Blueprint Standard, and Deposit Payment Links)
    const priorityIds = Object.values(PRIORITY_PRODUCTS);
    const allLinks = [];

    for (let i = 0; i < priorityIds.length; i++) {
      const productId = priorityIds[i];
      const productName = PRODUCT_DISPLAY_NAMES[productId] || productId;
      const links = await getCloserLinksForProduct(productId, productName);
      allLinks.push(...links);

      if (i < priorityIds.length - 1) {
        await delay(500);
      }
    }

    console.log(`[Whop] Found ${allLinks.length} closer links from priority products`);

    // Group links by productId
    const productMap = {};

    for (const link of allLinks) {
      const productId = link.productId;
      if (!productMap[productId]) {
        productMap[productId] = {
          productId: productId,
          productName: PRODUCT_DISPLAY_NAMES[productId] || link.productName,
          links: []
        };
      }
      productMap[productId].links.push(link);
    }

    // Convert to array and filter products with links
    let productsWithLinks = Object.values(productMap);

    // Sort: Blueprint+ first, Blueprint Standard second, Deposit Payment Links third, then alphabetically
    productsWithLinks.sort((a, b) => {
      if (a.productId === PRIORITY_PRODUCTS.BLUEPRINT_PLUS) return -1;
      if (b.productId === PRIORITY_PRODUCTS.BLUEPRINT_PLUS) return 1;
      if (a.productId === PRIORITY_PRODUCTS.BLUEPRINT_STANDARD) return -1;
      if (b.productId === PRIORITY_PRODUCTS.BLUEPRINT_STANDARD) return 1;
      if (a.productId === PRIORITY_PRODUCTS.DEPOSIT_PAYMENT_LINKS) return -1;
      if (b.productId === PRIORITY_PRODUCTS.DEPOSIT_PAYMENT_LINKS) return 1;
      return a.productName.localeCompare(b.productName);
    });

    // For each product, group links by closer
    const result = productsWithLinks.map(product => {
      const closersMap = {};

      for (const link of product.links) {
        const email = link.closerEmail;
        if (!closersMap[email]) {
          closersMap[email] = {
            email: email,
            closerName: email.split('@')[0].replace(/-/g, ' '),
            links: [],
            totalMembers: 0
          };
        }
        closersMap[email].links.push(link);
        closersMap[email].totalMembers += link.memberCount || 0;
      }

      // Get unique link types for this product
      const linkTypes = [...new Set(product.links.map(l => l.linkType))];

      return {
        productId: product.productId,
        productName: product.productName,
        closers: Object.values(closersMap).sort((a, b) => a.email.localeCompare(b.email)),
        totalClosers: Object.keys(closersMap).length,
        totalLinks: product.links.length,
        linkTypes: linkTypes
      };
    });

    console.log(`[Whop] Grouped into ${result.length} products with closer links`);

    return result;
  } catch (error) {
    console.error('[Whop] Error grouping closer links by product:', error.message);
    throw error;
  }
}

// Get all closer links (flat list from all products)
export async function getAllCloserLinks(forceRefresh = false) {
  try {
    // Check cache first
    if (!forceRefresh && linksCache && linksCacheTime && (Date.now() - linksCacheTime < CACHE_TTL)) {
      console.log('[Whop] Returning cached closer links');
      return linksCache;
    }

    console.log('[Whop] Fetching all closer links...');

    const products = await getAllProducts();
    const allLinks = [];

    // Prioritize fetching: priority products first, then others
    const priorityIds = Object.values(PRIORITY_PRODUCTS);
    const priorityProds = products.filter(p => priorityIds.includes(p.id));
    const otherProds = products.filter(p => !priorityIds.includes(p.id));
    const sortedProducts = [...priorityProds, ...otherProds];

    console.log(`[Whop] Fetching from ${sortedProducts.length} products (${priorityProds.length} priority first)`);

    for (let i = 0; i < sortedProducts.length; i++) {
      const product = sortedProducts[i];
      const links = await getCloserLinksForProduct(product.id, product.title);
      allLinks.push(...links);

      // Add delay between products to avoid rate limits
      if (i < sortedProducts.length - 1) {
        await delay(800);
      }
    }

    console.log(`[Whop] Found ${allLinks.length} closer links total`);

    // Update cache
    linksCache = allLinks;
    linksCacheTime = Date.now();

    return allLinks;
  } catch (error) {
    console.error('[Whop] Error fetching closer links:', error.message);
    throw error;
  }
}

// Clear the cache (call after delete operations)
export function clearLinksCache() {
  linksCache = null;
  linksCacheTime = null;
  console.log('[Whop] Cache cleared');
}

// Get closer links grouped by closer email (legacy - for backwards compatibility)
export async function getCloserLinksGrouped() {
  try {
    const allLinks = await getAllCloserLinks();

    // Group by closer email
    const grouped = {};

    for (const link of allLinks) {
      const email = link.closerEmail;

      if (!grouped[email]) {
        grouped[email] = {
          email: email,
          closerName: email.split('@')[0].replace(/-/g, ' '),
          links: [],
          totalMembers: 0
        };
      }

      grouped[email].links.push(link);
      grouped[email].totalMembers += link.memberCount || 0;
    }

    // Convert to array and sort by email
    const result = Object.values(grouped).sort((a, b) =>
      a.email.localeCompare(b.email)
    );

    console.log(`[Whop] Grouped into ${result.length} closers`);

    return result;
  } catch (error) {
    console.error('[Whop] Error grouping closer links:', error.message);
    throw error;
  }
}

// Get links for a specific closer (FAST - priority products only)
export async function getLinksForCloser(closerEmail) {
  try {
    console.log(`[Whop] Fetching links for ${closerEmail} from priority products only...`);
    
    const priorityIds = Object.values(PRIORITY_PRODUCTS);
    const allLinks = [];

    // Only fetch from Blueprint+, Blueprint Standard, and Deposit Payment Links
    for (let i = 0; i < priorityIds.length; i++) {
      const productId = priorityIds[i];
      const productName = PRODUCT_DISPLAY_NAMES[productId] || productId;
      
      console.log(`[Whop] Fetching from ${productName}...`);
      const links = await getCloserLinksForProduct(productId, productName);
      allLinks.push(...links);

      if (i < priorityIds.length - 1) {
        await delay(500);
      }
    }

    // Filter for this specific closer
    const closerLinks = allLinks.filter(link =>
      link.closerEmail.toLowerCase() === closerEmail.toLowerCase()
    );

    console.log(`[Whop] Found ${closerLinks.length} links for ${closerEmail}`);
    return closerLinks;
  } catch (error) {
    console.error('[Whop] Error fetching links for closer:', error.message);
    throw error;
  }
}

// Delete all links for a specific closer (optionally filter by product)
export async function deleteLinksForCloser(closerEmail, productId = null) {
  try {
    console.log(`[Whop] Deleting links for closer: ${closerEmail}${productId ? ` (product: ${productId})` : ''}`);

    // Get links for this closer
    let links = await getLinksForCloser(closerEmail);

    // Filter by product if specified
    if (productId) {
      links = links.filter(l => l.productId === productId);
    }

    if (links.length === 0) {
      console.log(`[Whop] No links found for closer: ${closerEmail}`);
      return { deletedCount: 0 };
    }

    console.log(`[Whop] Found ${links.length} links to delete for ${closerEmail}`);

    // Delete each plan
    let deletedCount = 0;
    const errors = [];

    for (const link of links) {
      try {
        await whopClient.delete(`/plans/${link.id}`);
        deletedCount++;
        console.log(`[Whop] Deleted plan: ${link.id}`);
      } catch (error) {
        console.error(`[Whop] Failed to delete plan ${link.id}:`, error.response?.data || error.message);
        errors.push({ planId: link.id, error: error.response?.data || error.message });
      }
    }

    console.log(`[Whop] Successfully deleted ${deletedCount}/${links.length} links for ${closerEmail}`);

    if (errors.length > 0) {
      console.warn(`[Whop] ${errors.length} links failed to delete:`, errors);
    }

    // Clear cache after deletion
    clearLinksCache();

    return { deletedCount, totalLinks: links.length, errors };
  } catch (error) {
    console.error('[Whop] Error deleting links for closer:', error.message);
    throw error;
  }
}

// Delete a single plan by ID
export async function deletePlan(planId) {
  try {
    console.log(`\n🗑️  [Whop DELETE] Plan ID: ${planId}`);
    
    const response = await whopClient.delete(`/plans/${planId}`);
    
    console.log(`✅ [Whop DELETE] Successfully deleted plan: ${planId}\n`);
    
    // Clear cache after deletion
    clearLinksCache();
    
    return response.data;
  } catch (error) {
    console.error(`❌ [Whop DELETE] Error deleting plan ${planId}:`, error.response?.data || error.message);
    throw error;
  }
}

// Update a plan
export async function updatePlan(planId, updates) {
  try {
    console.log(`\n✏️  [Whop UPDATE] Plan ID: ${planId}`);
    console.log(`📝 [Whop UPDATE] Requested changes:`, JSON.stringify(updates, null, 2));
    
    // Prepare update payload based on what fields are provided
    const payload = {};
    
    if (updates.closerEmail !== undefined) {
      // Update internal_notes with new email while preserving prefix
      const currentPlan = await whopClient.get(`/plans/${planId}`);
      const currentNotes = currentPlan.data.internal_notes || '';
      
      // Extract prefix from current notes
      const prefixMatch = currentNotes.match(/^([a-z0-9]+)-/i);
      const prefix = prefixMatch ? prefixMatch[1] : 'pif';
      
      payload.internal_notes = `${prefix}-${updates.closerEmail}`;
      console.log(`📧 [Whop UPDATE] Email: ${currentNotes} → ${payload.internal_notes}`);
    }
    
    if (updates.initialPrice !== undefined) {
      payload.initial_price = parseFloat(updates.initialPrice);
      console.log(`💰 [Whop UPDATE] Initial Price: $${payload.initial_price}`);
    }
    
    if (updates.renewalPrice !== undefined) {
      payload.renewal_price = parseFloat(updates.renewalPrice);
      console.log(`💰 [Whop UPDATE] Renewal Price: $${payload.renewal_price}`);
    }
    
    if (updates.installments !== undefined) {
      payload.split_pay_required_payments = parseInt(updates.installments);
      console.log(`📊 [Whop UPDATE] Installments: ${payload.split_pay_required_payments}`);
    }
    
    if (updates.planType !== undefined) {
      payload.plan_type = updates.planType;
      console.log(`🔄 [Whop UPDATE] Plan Type: ${payload.plan_type}`);
    }
    
    if (updates.billingPeriod !== undefined) {
      payload.billing_period = parseInt(updates.billingPeriod);
      console.log(`📅 [Whop UPDATE] Billing Period: ${payload.billing_period} days`);
    }
    
    console.log(`🚀 [Whop UPDATE] Sending to Whop API...`);
    const response = await whopClient.patch(`/plans/${planId}`, payload);
    
    console.log(`✅ [Whop UPDATE] Successfully updated plan: ${planId}\n`);
    
    // Clear cache after update
    clearLinksCache();
    
    return response.data;
  } catch (error) {
    console.error(`❌ [Whop UPDATE] Error updating plan ${planId}:`, error.response?.data || error.message);
    throw error;
  }
}

export default {
  getAllCloserLinks,
  getCloserLinksGrouped,
  getCloserLinksGroupedByProduct,
  getLinksForCloser,
  deleteLinksForCloser,
  deletePlan,
  updatePlan,
  clearLinksCache,
  PRIORITY_PRODUCTS
};