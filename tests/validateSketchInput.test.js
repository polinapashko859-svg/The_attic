const assert = require('node:assert/strict');
const test = require('node:test');
const validateSketchInput = require('../utils/validateSketchInput');

test('trims publication fields and calculates reading time on the server', () => {
    const result = validateSketchInput({
        title: '  My sketch  ',
        content: Array(151).fill('word').join(' '),
        imageUrl: ''
    });

    assert.equal(result.error, undefined);
    assert.equal(result.value.title, 'My sketch');
    assert.equal(result.value.paperType, 'parchment');
    assert.equal(result.value.imageUrl, null);
    assert.equal(result.value.readingTime, 2);
});

test('rejects short text and unsupported branches', () => {
    assert.match(
        validateSketchInput({ title: 'ab', content: 'Long enough content' }).error,
        /Заголовок/
    );
    assert.match(
        validateSketchInput({ title: 'Valid title', content: 'Long enough content', paperType: 'unknown' }).error,
        /веток/
    );
});

test('only accepts valid HTTP(S) image links', () => {
    const result = validateSketchInput({
        title: 'Valid title',
        content: 'Long enough content',
        imageUrl: 'javascript:alert(1)'
    });

    assert.match(result.error, /http/);
});

test('allows an update to retain its current branch and image link', () => {
    const result = validateSketchInput({
        title: 'Updated title',
        content: 'Updated content is long enough'
    }, { partial: true });

    assert.equal(result.error, undefined);
    assert.equal(result.value.paperType, undefined);
    assert.equal(result.value.imageUrl, undefined);
});
