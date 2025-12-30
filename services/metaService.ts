
import { MetaAdAccount, DataRow } from '../types';

/**
 * Meta Ads SDK & API Service
 */

export const initMetaSdk = (appId: string): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).FB) {
      (window as any).FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0' 
      });
      resolve();
      return;
    }

    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0'
      });
      resolve();
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as any; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  });
};

export const loginWithMeta = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!(window as any).FB) {
      reject('Meta SDK nav ielādēts.');
      return;
    }

    // No 'email' scope to prevent invalid scope errors
    const SCOPES = [
      'public_profile',
      'ads_read',
      'ads_management',
      'leads_retrieval',
      'business_management',
      'pages_read_engagement',
      'pages_show_list'
    ].join(',');

    console.log('[AdPilot] Final Sync Scopes:', SCOPES);

    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        resolve(response.authResponse.accessToken);
      } else {
        console.error('[AdPilot] Login error response:', response);
        reject('Autorizācija neizdevās. Pārliecinies, ka ielogojies ar to pašu profilu, kas ir Meta Developer App īpašnieks.');
      }
    }, { 
        scope: SCOPES,
        auth_type: 'rerequest',
        return_scopes: true
    });
  });
};

export const fetchAdAccounts = async (accessToken: string): Promise<MetaAdAccount[]> => {
  return new Promise((resolve, reject) => {
    (window as any).FB.api('/me/adaccounts', {
      access_token: accessToken,
      fields: 'id,name,currency,account_id'
    }, (response: any) => {
      if (response && !response.error) {
        resolve(response.data);
      } else {
        reject(response.error);
      }
    });
  });
};

/**
 * Fetch insights with breakdown by Publisher Platform (FB, IG, Messenger, etc.)
 */
export const fetchMetaPlatformBreakdown = async (
  adAccountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<DataRow[]> => {
  return new Promise((resolve, reject) => {
    const fields = [
        'insights.time_range({"since":"' + startDate + '","until":"' + endDate + '"}).breakdowns(publisher_platform){spend,impressions,clicks,cpc,cpm,ctr,frequency,actions,action_values,purchase_roas}'
    ].join(',');

    (window as any).FB.api(`/${adAccountId}`, {
      access_token: accessToken,
      fields: fields
    }, (response: any) => {
      if (response && !response.error) {
        // The response for account level with breakdown comes in `insights.data`
        // Note: When querying account level directly, response.insights is the edge
        const insights = response.insights?.data || [];
        const mappedData: DataRow[] = [];

        insights.forEach((insight: any) => {
            const platform = insight.publisher_platform || 'unknown';
            
            // --- REVENUE CALCULATION ---
            const getActionValue = (actionType: string) => {
                return parseFloat(insight.action_values?.find((a: any) => a.action_type === actionType)?.value || '0');
            };
            
            let revenue = getActionValue('omni_purchase'); 
            if (revenue === 0) revenue = getActionValue('purchase');
            if (revenue === 0) revenue = getActionValue('offsite_conversion.fb_pixel_purchase');

            // --- ROAS CALCULATION ---
            let roas = 0;
            if (insight.purchase_roas) {
                roas = parseFloat(insight.purchase_roas.find((a: any) => a.action_type === 'omni_purchase')?.value || '0');
            }
            const spend = parseFloat(insight.spend || '0');
            if (roas === 0 && spend > 0) {
                roas = revenue / spend;
            }

            // --- CONVERSION CALCULATION ---
            const getActionCount = (actionType: string) => {
                 return parseInt(insight.actions?.find((a: any) => a.action_type === actionType)?.value || '0');
            };
            
            let conversions = getActionCount('omni_purchase') || getActionCount('lead') || getActionCount('offsite_conversion.fb_pixel_lead');
            const purchases = getActionCount('omni_purchase') || getActionCount('purchase');
            const leads = getActionCount('lead') || getActionCount('on-facebook_lead');

            mappedData.push({
                'Platform': platform,
                'Spend': spend,
                'Impressions': parseInt(insight.impressions || '0'),
                'Clicks': parseInt(insight.clicks || '0'),
                'CTR': parseFloat(insight.ctr || '0'),
                'CPC': parseFloat(insight.cpc || '0'),
                'CPM': parseFloat(insight.cpm || '0'),
                'Revenue': revenue,
                'ROAS': roas,
                'Conversions': conversions,
                'Results': conversions,
                'Purchases': purchases,
                'Leads': leads
            });
        });

        resolve(mappedData);
      } else {
        reject(response.error);
      }
    });
  });
};

/**
 * Enhanced Fetch Logic:
 * 1. Fetches at 'Ad' level to get granular data.
 * 2. Fetches 'creative' field to get image/thumbnail URLs. (Video URL removed for stability)
 * 3. Supports Custom Date Ranges.
 * 4. Extracts robust ROAS and Revenue data.
 * 5. Uses time_increment(1) or 'monthly' to get breakdowns for charting.
 */
export const fetchMetaInsights = async (
  adAccountId: string, 
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<DataRow[]> => {
  return new Promise((resolve, reject) => {
    // Determine optimal granularity to prevent timeout
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // If period is longer than 2 years (approx 730 days), switch to monthly to avoid Meta API timeout
    // "Lifetime" usually hits 10+ years
    // Note: Graph API requires quotes for string enums in some contexts, so we use 'monthly'
    const timeIncrement = diffDays > 730 ? "'monthly'" : "1";

    const fields = [
        'name',
        'creative{thumbnail_url,image_url,title,body}', // REMOVED video_url for safety
        'status',
        `insights.time_range({"since":"${startDate}","until":"${endDate}"}).time_increment(${timeIncrement}){
            spend,
            impressions,
            clicks,
            cpc,
            cpm,
            ctr,
            frequency,
            actions,
            action_values,
            purchase_roas,
            date_start,
            date_stop,
            campaign_name,
            adset_name
        }`
    ].join(',');

    (window as any).FB.api(`/${adAccountId}/ads`, {
      access_token: accessToken,
      fields: fields,
      limit: 200 // Analyze top 200 active/recent ads
    }, (response: any) => {
      if (response && !response.error) {
        const rawAds = response.data;
        const mappedData: DataRow[] = [];

        rawAds.forEach((ad: any) => {
            // Some ads might not have insights for the selected period
            if (!ad.insights || !ad.insights.data) return;

            // Iterate over ALL breakdown rows
            ad.insights.data.forEach((insight: any) => {
                
                // --- REVENUE CALCULATION ---
                const getActionValue = (actionType: string) => {
                    return parseFloat(insight.action_values?.find((a: any) => a.action_type === actionType)?.value || '0');
                };
                
                let revenue = getActionValue('omni_purchase'); // Default Meta Total
                if (revenue === 0) revenue = getActionValue('purchase'); // Standard Pixel
                if (revenue === 0) revenue = getActionValue('offsite_conversion.fb_pixel_purchase');

                // --- ROAS CALCULATION ---
                let roas = 0;
                if (insight.purchase_roas) {
                    roas = parseFloat(insight.purchase_roas.find((a: any) => a.action_type === 'omni_purchase')?.value || '0');
                }
                const spend = parseFloat(insight.spend || '0');
                if (roas === 0 && spend > 0) {
                    roas = revenue / spend;
                }

                // --- CONVERSION CALCULATION ---
                const getActionCount = (actionType: string) => {
                     return parseInt(insight.actions?.find((a: any) => a.action_type === actionType)?.value || '0');
                };
                
                // Sum up likely conversion events
                let conversions = getActionCount('omni_purchase') || getActionCount('lead') || getActionCount('offsite_conversion.fb_pixel_lead');

                // Granular specific counts
                const purchases = getActionCount('omni_purchase') || getActionCount('purchase');
                const leads = getActionCount('lead') || getActionCount('on-facebook_lead'); // Meta often uses 'on-facebook_lead' for instant forms

                mappedData.push({
                    'Ad Name': ad.name,
                    'Campaign Name': insight.campaign_name,
                    'Ad Set Name': insight.adset_name,
                    'Status': ad.status,
                    'Date Start': insight.date_start, // This will be daily or monthly depending on timeIncrement
                    'Date Stop': insight.date_stop,
                    
                    // Creative Data
                    'Creative Thumbnail': ad.creative?.thumbnail_url || ad.creative?.image_url || '',
                    // Video URL removed
                    'Creative Title': ad.creative?.title || '',
                    
                    // Metrics
                    'Spend': spend,
                    'Impressions': parseInt(insight.impressions || '0'),
                    'Clicks': parseInt(insight.clicks || '0'),
                    'CTR': parseFloat(insight.ctr || '0'),
                    'CPC': parseFloat(insight.cpc || '0'),
                    'CPM': parseFloat(insight.cpm || '0'),
                    'Frequency': parseFloat(insight.frequency || '0'),
                    
                    // Key Performance
                    'Revenue': revenue,
                    'ROAS': roas,
                    'Conversions': conversions,
                    'Results': conversions,
                    'Purchases': purchases,
                    'Leads': leads
                });
            });
        });

        resolve(mappedData);
      } else {
        reject(response.error);
      }
    });
  });
};
