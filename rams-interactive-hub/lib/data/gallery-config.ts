/**
 * Gallery Configuration - 15 cards with some having multiple logos
 */

import { RAMS_PROJECTS, getProjectById } from "./projects";

export interface GalleryCard {
  id: string;
  projectIds: string[]; // Can have multiple projects (for multi-logo cards)
  name: string;
  title?: string;
}

// 15 cards configuration - Original brand names (no translation)
export const GALLERY_CARDS: GalleryCard[] = [
  { id: "1", projectIds: ["09-rams-garden-almaty"], name: "RAMS GARDEN", title: "ALMATY" },
  { id: "2", projectIds: ["22-almaty-museum"], name: "ALMATY MUSEUM OF ARTS" },
  { id: "3", projectIds: ["11-rams-signature"], name: "RAMS SIGNATURE" },
  { id: "4", projectIds: ["12-rams-saiahat"], name: "RAMS SAIAHAT" },
  { id: "5", projectIds: ["15-rams-evo"], name: "RAMS EVO" },
  { id: "6", projectIds: ["08-vostochny-park"], name: "VOSTOCHNY PARK" },
  { id: "7", projectIds: ["05-dom-na-abaya"], name: "DOM NA ABAYA" },
  { id: "8", projectIds: ["26-marriott-issykkul"], name: "MARRIOTT ISSYK-KUL" },
  { id: "9", projectIds: ["23-haval", "27-hyundai", "24-lukoil"], name: "HAVAL • HYUNDAI • LUKOIL" },
  { id: "10", projectIds: ["18-lamiya"], name: "LAMIYA" },
  { id: "11", projectIds: ["20-ile-de-france"], name: "ILE DE FRANCE" },
  { id: "12", projectIds: ["13-rams-garden-atyrau"], name: "RAMS GARDEN", title: "ATYRAU" },
  { id: "13", projectIds: ["21-forum-residence"], name: "FORUM RESIDENCE" },
  { id: "14", projectIds: ["19-la-verde"], name: "LA VERDE" },
  { id: "15", projectIds: ["17-ortau", "14-ortau-marriott-bc"], name: "ORTAU" },
];

// Helper to get projects for a gallery card
export const getProjectsForCard = (card: GalleryCard) => {
  return card.projectIds.map(id => getProjectById(id)).filter(Boolean);
};

// Get all gallery cards with their projects
export const getGalleryData = () => {
  return GALLERY_CARDS.map(card => ({
    ...card,
    projects: getProjectsForCard(card),
  }));
};
