const AGE_TEXT_BASE_STYLE = {
  color: '#000000',
};

export const getAgeTextTier = (ageDays) => {
  const normalizedAge = Number(ageDays) || 0;
  if (normalizedAge >= 60) return 'age-text-tier-60';
  if (normalizedAge >= 45) return 'age-text-tier-45';
  return 'age-text-tier-under45';
};

export const getAgeTextStyle = (ageDays) => {
  const tier = getAgeTextTier(ageDays);

  if (tier === 'age-text-tier-60') {
    return {
      ...AGE_TEXT_BASE_STYLE,
      color: '#ff0000',
      fontWeight: 700,
    };
  }

  if (tier === 'age-text-tier-45') {
    return {
      ...AGE_TEXT_BASE_STYLE,
      color: '#000000',
      fontWeight: 700,
    };
  }

  return {
    ...AGE_TEXT_BASE_STYLE,
    color: '#000000',
    fontWeight: 400,
  };
};

export const getAgeTextClassName = (ageDays) => `age-text ${getAgeTextTier(ageDays)}`;