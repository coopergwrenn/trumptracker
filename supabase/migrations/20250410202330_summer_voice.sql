/*
  # Add test news articles

  1. New Data
    - Adds 50 test news articles to demonstrate infinite scrolling
    - Varied dates, sources, and content
    - Includes both original and neutralized content
*/

-- Insert test news articles with varied dates and sources
INSERT INTO news_headlines (
  original_title,
  neutral_title,
  original_description,
  neutral_description,
  url,
  published_at,
  source_name
)
SELECT
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Trump Slams Biden Administration Over Border Crisis, Vows Immediate Action'
    WHEN 1 THEN 'Trump''s Legal Team Files Motion to Dismiss Georgia Election Case'
    WHEN 2 THEN 'Trump Promises Major Economic Overhaul in Second Term'
    WHEN 3 THEN 'Trump Criticizes Federal Reserve''s Interest Rate Decisions'
    ELSE 'Trump Outlines New Immigration Policy at Campaign Rally'
  END AS original_title,
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Trump Addresses Border Policy, Presents Alternative Approach'
    WHEN 1 THEN 'Trump Legal Team Submits Motion in Georgia Election Proceedings'
    WHEN 2 THEN 'Trump Presents Economic Policy Plans for Potential Second Term'
    WHEN 3 THEN 'Trump Comments on Federal Reserve Monetary Policy'
    ELSE 'Trump Presents Immigration Policy Proposals at Campaign Event'
  END AS neutral_title,
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'In a fiery speech that energized his base, Trump blasted the current administration''s handling of the border crisis, promising swift and decisive action if re-elected.'
    WHEN 1 THEN 'Trump''s attorneys launched a aggressive legal strategy, filing a comprehensive motion to dismiss what they called "politically motivated" charges in Georgia.'
    WHEN 2 THEN 'The former president unveiled a sweeping economic plan that he claims will revolutionize the American economy and bring back millions of jobs.'
    WHEN 3 THEN 'Trump accused the Federal Reserve of mismanaging monetary policy, claiming their decisions are hurting American workers and businesses.'
    ELSE 'Speaking to a packed arena, Trump outlined his vision for a complete overhaul of the immigration system, drawing both praise and criticism.'
  END AS original_description,
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Former President Trump discussed border policy and presented alternative approaches.\n\nKey points:\n- Current border statistics discussed\n- Alternative policy proposals outlined\n- Implementation timeline presented\n- Economic implications addressed\n- International cooperation mentioned'
    WHEN 1 THEN 'Legal motion filed in Georgia election case proceedings.\n\nDetails:\n- Motion contents summarized\n- Legal arguments presented\n- Procedural timeline outlined\n- Case background provided\n- Next steps identified'
    WHEN 2 THEN 'Economic policy proposals presented for potential second term.\n\nProposal overview:\n- Policy objectives stated\n- Implementation strategy outlined\n- Economic projections provided\n- Industry impacts assessed\n- Timeline discussed'
    WHEN 3 THEN 'Comments made regarding Federal Reserve monetary policy.\n\nKey topics:\n- Interest rate discussion\n- Economic impact analysis\n- Policy alternatives suggested\n- Market reactions noted\n- Historical context provided'
    ELSE 'Immigration policy proposals presented at campaign event.\n\nPolicy details:\n- Current system analysis\n- Proposed changes outlined\n- Implementation approach\n- Economic considerations\n- International implications'
  END AS neutral_description,
  'https://example.com/news/' || i AS url,
  NOW() - (i || ' hours')::INTERVAL AS published_at,
  CASE (RANDOM() * 4)::INT
    WHEN 0 THEN 'Reuters'
    WHEN 1 THEN 'Associated Press'
    WHEN 2 THEN 'Bloomberg'
    WHEN 3 THEN 'The Wall Street Journal'
    ELSE 'CNBC'
  END AS source_name
FROM generate_series(1, 50) i;