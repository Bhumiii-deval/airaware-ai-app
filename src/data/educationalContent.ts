export interface IndoorGuideSection {
  id: string;
  title: string;
  subtitle: string;
  keyRule: string;
  steps: string[];
  avoid: string;
}

export const INDOOR_GUIDE_SECTIONS: IndoorGuideSection[] = [
  {
    id: 'ventilation',
    title: 'Smart Ventilation Timing',
    subtitle: 'Open windows only when actual local AQI readings show cleaner outdoor air.',
    keyRule: 'Check your local 24-hour AQI chart before opening windows—never rely on fixed clock times. Briefly ventilate during the lowest-AQI hours shown for your city, and keep windows closed when AQI is Poor or worse.',
    steps: [
      'Review the actual 24-hour trend chart on your dashboard before opening balcony doors or bedroom windows.',
      'Affordable draft control: when outdoor AQI exceeds 200 (Poor or worse), close windows and place a rolled cotton towel or low-cost foam draft stopper along door gaps.',
      'If using an air conditioner during severe smog, switch the intake setting to "Recirculate" rather than drawing in unfiltered outside air.',
      'If indoor air feels stuffy during prolonged poor air quality, briefly air out one room only during the lowest-AQI hour shown in live local data, keeping children and sensitive adults in another closed room.',
    ],
    avoid: 'Do not leave windows open overnight without checking live air quality—calm, cool air can trap fine pollution close to ground level.',
  },
  {
    id: 'kitchen',
    title: 'Kitchen Exhaust & Cooking Emissions',
    subtitle: 'High-heat frying and unvented gas stoves can push indoor PM2.5 above 300 µg/m³ within minutes.',
    keyRule: 'Always run a ducted chimney or exhaust fan 5 minutes before cooking and 15 minutes after finishing.',
    steps: [
      'Use back burners under the exhaust hood whenever possible—capture efficiency is significantly higher than front burners.',
      'Cover pots with lids to shorten cooking time and cut moisture, oil aerosols, and NO₂ build-up.',
      'Clean kitchen chimney baffle filters every 3–4 weeks so grease buildup does not choke airflow.',
      'Prefer induction, pressure cooking, steaming, or simmering over high-smoke deep frying during Severe AQI episodes.',
    ],
    avoid: 'Avoid cooking in an unventilated closed kitchen with no exhaust fan, especially when children or older adults are seated nearby.',
  },
  {
    id: 'smoke',
    title: 'Eliminating Indoor Smoke & Combustion',
    subtitle: 'Indoor burning adds concentrated fine particles directly into sealed rooms.',
    keyRule: 'Keep indoor spaces 100% combustion-free whenever outdoor air is already polluted.',
    steps: [
      'Pause incense sticks (agarbatti), dhoop, scented candles, and mosquito coils during Poor to Severe AQI days—they emit high ultrafine particle spikes.',
      'Enforce a strict no-smoking policy inside the home and on adjacent balconies with open doors.',
      'Switch from burning mosquito coils to window mesh screens, electric liquid vaporizers in ventilated spaces, or mosquito nets.',
      'Use wet mopping and damp microfiber cloths instead of dry sweeping, which resuspends settled PM10 and fine dust into breathing height.',
    ],
    avoid: 'Never burn charcoal braziers, wood heaters, or unvented kerosene heaters indoors for winter warmth—this causes both acute PM2.5 and fatal carbon monoxide risks.',
  },
  {
    id: 'hepa',
    title: 'HEPA Air Purifier Placement & Maintenance',
    subtitle: 'Mechanical True HEPA (H13/H14) filtration is the most effective indoor PM2.5 intervention.',
    keyRule: 'Match the purifier CADR (Clean Air Delivery Rate) to your room size so it achieves 4–5 air changes per hour (ACH).',
    steps: [
      'Choose purifiers with certified True HEPA (H13/H14) mechanical filters plus an activated carbon pre-filter for odors and gases.',
      'Place the unit at least 30 cm away from walls and curtains so intake vents are unobstructed; prioritize bedrooms where families spend 8+ continuous hours.',
      'Run the purifier on medium-high 30 minutes before bedtime, then drop to quiet/sleep mode overnight with doors closed.',
      'Vacuum the washable mesh pre-filter every 2 weeks during winter smog and replace the HEPA cartridge per manufacturer hours (typically 6–12 months in high-PM cities).',
    ],
    avoid: 'Avoid ozone-generating "ionizer" or UV-only purifiers without mechanical HEPA filters—ozone itself is a lung irritant.',
  },
];

export interface PollutionTopic {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  keyFacts: string[];
  practicalTakeaway: string;
}

export const POLLUTION_EDUCATION_TOPICS: PollutionTopic[] = [
  {
    id: 'aqi',
    title: 'What is AQI (Air Quality Index)?',
    subtitle: 'One standardized number translating complex pollutant chemistry into daily health guidance.',
    summary:
      'The Air Quality Index converts concentrations of major pollutants (PM2.5, PM10, NO₂, SO₂, CO, and O₃) into a single 0–500 scale. The overall AQI equals the highest sub-index among measured pollutants—meaning the worst pollutant determines the health risk.',
    keyFacts: [
      'India’s National Air Quality Index (NAQI) defines 6 clear bands: Good (0–50), Satisfactory (51–100), Moderate (101–200), Poor (201–300), Very Poor (301–400), and Severe (401–500).',
      'AQI is non-linear: moving from 100 to 300 represents a steep jump in fine particulate exposure and respiratory strain.',
      'Always look at both the headline AQI and the dominant pollutant—PM2.5 winter smog requires different precautions than afternoon summer ozone.',
    ],
    practicalTakeaway: 'Treat AQI like a daily weather forecast: check it each morning before scheduling outdoor walks, school sports, or window ventilation.',
  },
  {
    id: 'pm25-pm10',
    title: 'PM2.5 vs PM10: Why Particle Size Matters',
    subtitle: 'Understanding how microscopic particles interact with human airways.',
    summary:
      'Particulate matter (PM) is a mixture of solid particles and liquid droplets suspended in air. A human hair is roughly 50–70 micrometers (µm) wide. PM10 particles are ≤10 µm (about 1/6th of a hair), while PM2.5 particles are ≤2.5 µm—nearly 30 times finer than a hair.',
    keyFacts: [
      'PM10 (coarse dust, road silt, construction debris) is mostly filtered by the nose and upper throat, causing irritation, coughing, and sinus discomfort.',
      'PM2.5 (vehicle exhaust, biomass smoke, secondary sulfates/nitrates) bypasses upper airway defenses, reaches deep lung alveoli, and can enter systemic circulation.',
      'Standard surgical or cloth masks leave side gaps and cannot reliably filter 2.5 µm particles—only snug N95/FFP2 electrostatic melt-blown respirators provide effective PM2.5 filtration.',
    ],
    practicalTakeaway: 'When PM2.5 is high even if the sky looks mildly hazy, protect children and seniors indoors and use a properly fitted N95 respirator outdoors.',
  },
  {
    id: 'winter-smog',
    title: 'Why Winter Smog Turns Severe',
    subtitle: 'Temperature inversion acts like an invisible lid trapping pollution near the ground.',
    summary:
      'In warmer weather, ground-level air warms up, rises, and carries pollutants away. On calm, cool winter nights, the ground cools quickly and traps a heavy layer of cold air beneath warmer air above—called a temperature inversion.',
    keyFacts: [
      'Slow wind speeds prevent urban vehicle exhaust, road dust, and smoke from blowing away.',
      'Cool humidity lets water droplets cling to microscopic PM2.5 particles, forming dense grey haze.',
      'Cleaner and dirtier hours shift daily with local wind, cloud cover, and traffic—so always check actual hourly AQI data rather than assuming a fixed safe clock time.',
    ],
    practicalTakeaway: 'Before planning walks for children, older adults, or people with asthma, check the live hourly chart and wear a well-fitted N95 mask if going outside cannot be avoided.',
  },
  {
    id: 'sources',
    title: 'Major Sources of Urban Air Pollution',
    subtitle: 'Pollution is cumulative—combining transport, dust, industry, energy, and seasonal burning.',
    summary:
      'Source apportionment studies across major Asian and global metros consistently show that no single source causes urban smog alone. Transport tailpipes, resuspended road and construction dust, industrial combustion, thermal power, waste burning, and seasonal agricultural residue all compound together.',
    keyFacts: [
      'Road Transport (20%–35% in dense corridors): Diesel trucks, older two-wheelers, idling traffic, and brake/tire wear emit PM2.5 and NO₂ directly at breathing height.',
      'Road & Construction Dust (15%–30%): Unpaved shoulders, uncovered rubble transport, and dry sweeping drive high PM10 levels.',
      'Residential, Industrial & Seasonal Burning (20%–40%): Solid biomass cooking/heating, open garbage burning, brick kilns, diesel generators, and post-harvest crop residue burning create regional PM2.5 plumes.',
    ],
    practicalTakeaway: 'Community choices matter: shifting short solo vehicle trips to transit/carpooling, avoiding waste burning, and supporting dust-controlled construction directly lower neighborhood exposure.',
  },
];
