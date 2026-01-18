/**
 * Kano State Facilities (PHCs) - Demo Dataset
 *
 * Primary Health Care facilities across Kano LGAs
 * Realistic distribution reflecting urban/semi-rural patterns
 */

export interface DemoFacility {
  id: string;
  name: string;
  type: 'facility';
  lga: string;
  lat: number;
  lng: number;
  demandSlots: number;
}

export const facilities: DemoFacility[] = [
  // Kano Municipal (Dense Urban)
  {
    id: 'phc-km-01',
    name: 'PHC Sabon Gari',
    type: 'facility',
    lga: 'Kano Municipal',
    lat: 12.0054,
    lng: 8.5227,
    demandSlots: 3,
  },
  {
    id: 'phc-km-02',
    name: 'PHC Kofar Wambai',
    type: 'facility',
    lga: 'Kano Municipal',
    lat: 12.0101,
    lng: 8.5103,
    demandSlots: 2,
  },
  {
    id: 'phc-km-03',
    name: 'PHC Kabuga',
    type: 'facility',
    lga: 'Kano Municipal',
    lat: 11.9934,
    lng: 8.5311,
    demandSlots: 4,
  },

  // Dala (Urban)
  {
    id: 'phc-dala-01',
    name: 'PHC Dala',
    type: 'facility',
    lga: 'Dala',
    lat: 11.9903,
    lng: 8.4982,
    demandSlots: 4,
  },
  {
    id: 'phc-dala-02',
    name: 'PHC Kofar Ruwa',
    type: 'facility',
    lga: 'Dala',
    lat: 11.9874,
    lng: 8.5048,
    demandSlots: 3,
  },

  // Gwale (Urban)
  {
    id: 'phc-gwale-01',
    name: 'PHC Gwale',
    type: 'facility',
    lga: 'Gwale',
    lat: 11.9985,
    lng: 8.4862,
    demandSlots: 4,
  },
  {
    id: 'phc-gwale-02',
    name: 'PHC Mandawari',
    type: 'facility',
    lga: 'Gwale',
    lat: 12.0019,
    lng: 8.4804,
    demandSlots: 2,
  },

  // Fagge (Dense Urban)
  {
    id: 'phc-fagge-01',
    name: 'PHC Fagge',
    type: 'facility',
    lga: 'Fagge',
    lat: 12.0171,
    lng: 8.5241,
    demandSlots: 5,
  },
  {
    id: 'phc-fagge-02',
    name: 'PHC Yan Kaba',
    type: 'facility',
    lga: 'Fagge',
    lat: 12.0213,
    lng: 8.5189,
    demandSlots: 3,
  },

  // Tarauni (Urban)
  {
    id: 'phc-tarauni-01',
    name: 'PHC Hotoro',
    type: 'facility',
    lga: 'Tarauni',
    lat: 11.9607,
    lng: 8.5344,
    demandSlots: 5,
  },
  {
    id: 'phc-tarauni-02',
    name: 'PHC Unguwa Uku',
    type: 'facility',
    lga: 'Tarauni',
    lat: 11.9722,
    lng: 8.5411,
    demandSlots: 3,
  },

  // Ungogo (Peri-urban)
  {
    id: 'phc-ungogo-01',
    name: 'PHC Ungogo',
    type: 'facility',
    lga: 'Ungogo',
    lat: 12.0668,
    lng: 8.5377,
    demandSlots: 4,
  },
  {
    id: 'phc-ungogo-02',
    name: 'PHC Rijiyar Zaki',
    type: 'facility',
    lga: 'Ungogo',
    lat: 12.0813,
    lng: 8.5206,
    demandSlots: 3,
  },

  // Kumbotso (Peri-urban)
  {
    id: 'phc-kumbotso-01',
    name: 'PHC Kumbotso',
    type: 'facility',
    lga: 'Kumbotso',
    lat: 11.9319,
    lng: 8.4974,
    demandSlots: 4,
  },
  {
    id: 'phc-kumbotso-02',
    name: 'PHC Chiranchi',
    type: 'facility',
    lga: 'Kumbotso',
    lat: 11.9478,
    lng: 8.4689,
    demandSlots: 2,
  },

  // Nassarawa (Peri-urban)
  {
    id: 'phc-nassarawa-01',
    name: 'PHC Nassarawa',
    type: 'facility',
    lga: 'Nassarawa',
    lat: 11.9141,
    lng: 8.5423,
    demandSlots: 3,
  },
  {
    id: 'phc-nassarawa-02',
    name: 'PHC Bompai',
    type: 'facility',
    lga: 'Nassarawa',
    lat: 11.9271,
    lng: 8.5311,
    demandSlots: 4,
  },

  // Gezawa (Semi-rural)
  {
    id: 'phc-gezawa-01',
    name: 'PHC Gezawa',
    type: 'facility',
    lga: 'Gezawa',
    lat: 12.0991,
    lng: 8.7513,
    demandSlots: 6,
  },
  {
    id: 'phc-gezawa-02',
    name: 'PHC Babawa',
    type: 'facility',
    lga: 'Gezawa',
    lat: 12.0827,
    lng: 8.7138,
    demandSlots: 3,
  },
  {
    id: 'phc-gezawa-03',
    name: 'PHC Jigawar Tsada',
    type: 'facility',
    lga: 'Gezawa',
    lat: 12.1144,
    lng: 8.7227,
    demandSlots: 4,
  },
];
