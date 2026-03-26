import { useEffect } from 'react';

export default function PageTitle({ title }) {
  useEffect(function() {
    document.title = title ? title + ' — MorningTrade' : 'MorningTrade';
    return function() {
      document.title = 'MorningTrade';
    };
  }, [title]);
  return null;
}
