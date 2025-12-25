import { MetaAdAccount, DataRow } from '../types';

/**
 * Meta Ads SDK & API Service
 * Izmantojam visas atļaujas, kas redzamas lietotāja dashboard:
 * ads_read, ads_management, leads_retrieval, business_management, pages_read_engagement, pages_show_list, email
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

    // Pilns saraksts ar atļaujām, kas redzamas Tavā dashboardā
    const SCOPES = [
      'public_profile',
      'email',
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

export const fetchMetaInsights = async (adAccountId: string, accessToken: string): Promise<DataRow[]> => {
  return new Promise((resolve, reject) => {
    (window as any).FB.api(`/${adAccountId}/insights`, {
      access_token: accessToken,
      level: 'campaign',
      fields: 'campaign_name,spend,impressions,clicks,actions,date_start,date_stop',
      time_increment: 1,
      date_preset: 'last_30d'
    }, (response: any) => {
      if (response && !response.error) {
        const mappedData = response.data.map((insight: any) => {
          const conversions = insight.actions ? insight.actions.reduce((acc: number, action: any) => {
            if (['offsite_conversion.fb_pixel_lead', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'lead'].includes(action.action_type)) {
              return acc + parseInt(action.value || 0);
            }
            return acc;
          }, 0) : 0;

          return {
            'Date': insight.date_start,
            'Campaign Name': insight.campaign_name,
            'Spend': parseFloat(insight.spend || 0),
            'Impressions': parseInt(insight.impressions || 0),
            'Clicks': parseInt(insight.clicks || 0),
            'Conversions': conversions,
            'Revenue': insight.actions?.find((a: any) => a.action_type === 'omni_purchase')?.value || 0
          };
        });
        resolve(mappedData);
      } else {
        reject(response.error);
      }
    });
  });
};
