-- Host experience: first-time hosts (matches frontend `hostedBefore` option `first_time`)
INSERT INTO host_experience_type (code, name, description) VALUES
('first_time', 'Never hosted', 'Has not hosted this activity before')
ON CONFLICT (code) DO NOTHING;

-- Tags used by the add-experience UI (`features/experiences/add/data/tags.js`)
INSERT INTO tags (code, name) VALUES
('Hands-on', 'Hands-on'),
('Creative', 'Creative'),
('Beginner-Friendly', 'Beginner-Friendly'),
('Women Founder', 'Women Founder'),
('Outdoor', 'Outdoor')
ON CONFLICT (code) DO NOTHING;

-- Amenities referenced by the frontend (`features/experiences/constants.ts`)
INSERT INTO amenity (code, name, description) VALUES
('wifi', 'Wi-Fi', NULL),
('parking', 'Parking', NULL),
('wheelchairAccessible', 'Wheelchair Accessible', NULL),
('closeToBTS', 'Close to BTS', NULL),
('locker', 'Locker', NULL),
('shower', 'Shower', NULL),
('changingRooms', 'Changing Rooms', NULL),
('mats', 'Mats', NULL),
('towel', 'Towel', NULL),
('airConditioning', 'Air Conditioning', NULL),
('naturalVentilation', 'Natural Ventilation', NULL),
('quietSpace', 'Quiet Space', NULL),
('petFriendly', 'Pet Friendly', NULL),
('foodAndBeverages', 'Food & Beverages', NULL)
ON CONFLICT (code) DO NOTHING;
