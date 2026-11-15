const PAPER_TYPES = new Set(['parchment', 'kraft', 'linen', 'pressed-flower']);
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;
const CONTENT_MIN_LENGTH = 10;
const CONTENT_MAX_LENGTH = 10000;
const IMAGE_URL_MAX_LENGTH = 2048;

function validateSketchInput(body, { partial = false } = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: 'Передайте данные публикации в формате JSON-объекта.' };
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
        return { error: `Заголовок должен содержать от ${TITLE_MIN_LENGTH} до ${TITLE_MAX_LENGTH} символов.` };
    }
    if (content.length < CONTENT_MIN_LENGTH || content.length > CONTENT_MAX_LENGTH) {
        return { error: `Текст должен содержать от ${CONTENT_MIN_LENGTH} до ${CONTENT_MAX_LENGTH} символов.` };
    }

    let paperType = body.paperType;
    if (paperType === undefined && !partial) paperType = 'parchment';
    if (paperType !== undefined && !PAPER_TYPES.has(paperType)) {
        return { error: 'Выберите одну из доступных веток.' };
    }

    let imageUrl;
    if (Object.prototype.hasOwnProperty.call(body, 'imageUrl')) {
        if (body.imageUrl !== null && typeof body.imageUrl !== 'string') {
            return { error: 'Ссылка на изображение должна быть текстом.' };
        }

        imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : null;
        if (imageUrl === '') imageUrl = null;
        if (imageUrl && imageUrl.length > IMAGE_URL_MAX_LENGTH) {
            return { error: `Ссылка на изображение не должна превышать ${IMAGE_URL_MAX_LENGTH} символов.` };
        }
        if (imageUrl) {
            try {
                const parsedUrl = new URL(imageUrl);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    return { error: 'Ссылка на изображение должна начинаться с http:// или https://.' };
                }
            } catch {
                return { error: 'Введите корректную ссылку на изображение.' };
            }
        }
    } else if (!partial) {
        imageUrl = null;
    }

    const readingTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 150));

    return {
        value: {
            title,
            content,
            paperType,
            imageUrl,
            readingTime
        }
    };
}

module.exports = validateSketchInput;
