import { TEMPLATES } from '../data/eventTemplates';

export interface EventImageResult {
  source?: any; // For template images (require() result)
  uri?: string; // For uploaded images (URL)
  hasImage: boolean;
}

export const getTemplateImage = (templateId: string) => {
  for (const category of TEMPLATES) {
    const template = category.templates.find((t) => t.id === templateId);
    if (template) {
      return template.image;
    }
  }
  return null;
};

export const getEventImage = (event: any): EventImageResult => {
  // Check for template image first
  if (event.extra_data?.coverData?.selectedTemplate?.id) {
    const templateImage = getTemplateImage(event.extra_data.coverData.selectedTemplate.id);
    if (templateImage) {
      return { source: templateImage, hasImage: true };
    }
  }

  // Check for uploaded image
  const coverImage =
    event.extra_data?.coverData?.coverImage ||
    event.extra_data?.coverData?.uploadedImage ||
    event.cover_image ||
    event.image_url;

  if (coverImage && coverImage !== '') {
    return { uri: coverImage, hasImage: true };
  }

  return { hasImage: false };
};
