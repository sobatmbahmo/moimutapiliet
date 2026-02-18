import React, { createContext, useState, useEffect, useCallback } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const ReferralContext = createContext();

export function ReferralProvider({ children }) {
  const [referralData, setReferralData] = useState({
    affiliatorId: null,
    affiliatorName: null,
    isLoading: true
  });

  // Extract referral code from URL ?ref=XXXX parameter
  useEffect(() => {
    const extractReferralCode = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref');

        if (refCode) {
          // Store di sessionStorage untuk persistence selama session
          sessionStorage.setItem('referral_code', refCode);
          setReferralData({
            affiliatorId: refCode,
            affiliatorName: null,
            isLoading: false
          });
        } else {
          // Check if already in sessionStorage (dari session sebelumnya)
          const savedRef = sessionStorage.getItem('referral_code');
          if (savedRef) {
            setReferralData({
              affiliatorId: savedRef,
              affiliatorName: null,
              isLoading: false
            });
          } else {
            setReferralData({
              affiliatorId: null,
              affiliatorName: null,
              isLoading: false
            });
          }
        }
      } catch (error) {
        console.error('Error extracting referral code:', error);
        setReferralData({
          affiliatorId: null,
          affiliatorName: null,
          isLoading: false
        });
      }
    };

    extractReferralCode();
  }, []);

  // Function untuk set referral manually (jika diperlukan)
  const setReferral = useCallback((affiliatorId, name = null) => {
    if (affiliatorId) {
      sessionStorage.setItem('referral_code', affiliatorId);
      setReferralData({
        affiliatorId,
        affiliatorName: name,
        isLoading: false
      });
    }
  }, []);

  // Function untuk clear referral
  const clearReferral = useCallback(() => {
    sessionStorage.removeItem('referral_code');
    setReferralData({
      affiliatorId: null,
      affiliatorName: null,
      isLoading: false
    });
  }, []);

  // Function untuk check apakah ada active referral
  const hasReferral = referralData.affiliatorId !== null && !referralData.isLoading;

  const getShareLink = useCallback((baseUrl = window.location.origin) => {
    if (!referralData.affiliatorId) return null;
    return `${baseUrl}?ref=${referralData.affiliatorId}`;
  }, [referralData.affiliatorId]);

  const value = {
    referralData,
    setReferral,
    clearReferral,
    hasReferral,
    getShareLink
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

// Custom hook untuk menggunakan referral context
// eslint-disable-next-line react-refresh/only-export-components
export const useReferral = () => {
  const context = React.useContext(ReferralContext);
  
  // Return default context if not wrapped in provider
  if (!context) {
    return {
      referralData: { affiliatorId: null, affiliatorName: null, isLoading: false },
      setReferral: () => {},
      clearReferral: () => {},
      hasReferral: false,
      getShareLink: () => null
    };
  }
  
  return context;
};
