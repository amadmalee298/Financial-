-- Common SET stocks. Safe to run more than once.
insert into public.stocks (symbol, name, market, sector) values
  ('PTT',    'PTT Public Company Limited',                 'SET', 'Energy & Utilities'),
  ('AOT',    'Airports of Thailand',                       'SET', 'Transportation & Logistics'),
  ('CPALL',  'CP ALL',                                     'SET', 'Commerce'),
  ('ADVANC', 'Advanced Info Service',                      'SET', 'Information & Communication Technology'),
  ('KBANK',  'Kasikornbank',                               'SET', 'Banking'),
  ('SCB',    'SCB X',                                      'SET', 'Banking'),
  ('BDMS',   'Bangkok Dusit Medical Services',             'SET', 'Health Care Services'),
  ('DELTA',  'Delta Electronics (Thailand)',               'SET', 'Electronic Components'),
  ('BBL',    'Bangkok Bank',                               'SET', 'Banking'),
  ('KTB',    'Krung Thai Bank',                            'SET', 'Banking'),
  ('GULF',   'Gulf Development',                           'SET', 'Energy & Utilities'),
  ('PTTEP',  'PTT Exploration and Production',             'SET', 'Energy & Utilities'),
  ('SCC',    'The Siam Cement',                            'SET', 'Construction Materials'),
  ('CPN',    'Central Pattana',                            'SET', 'Property Development'),
  ('TRUE',   'True Corporation',                           'SET', 'Information & Communication Technology'),
  ('BH',     'Bumrungrad Hospital',                        'SET', 'Health Care Services'),
  ('MINT',   'Minor International',                        'SET', 'Tourism & Leisure'),
  ('CRC',    'Central Retail Corporation',                 'SET', 'Commerce'),
  ('TISCO',  'TISCO Financial Group',                      'SET', 'Banking'),
  ('LH',     'Land and Houses',                            'SET', 'Property Development')
on conflict (symbol, market) do nothing;
