<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\HttpException;
use App\Core\Model;

/** Specializzazione delle Bugie: non si smaschera prima di essere detta; non si mente a sé stessi. */
final class LiesModel extends Model
{
    protected function beforeSave(array $data, ?array $before): array
    {
        $value = static fn (string $f) => array_key_exists($f, $data) ? $data[$f] : ($before[$f] ?? null);
        $errors = [];
        if ($value('liar_id') !== null && $value('liar_id') === $value('told_to_id')) {
            $errors['told_to_id'] = 'Chi mente e chi ascolta devono essere diversi.';
        }
        if ($value('told_chapter') !== null && $value('exposed_chapter') !== null && $value('exposed_chapter') < $value('told_chapter')) {
            $errors['exposed_chapter'] = 'Non può essere smascherata prima di essere detta (capitolo ' . $value('told_chapter') . ').';
        }
        if ($errors) {
            throw new HttpException(422, 'Alcuni campi non sono validi.', ['fields' => $errors]);
        }
        return $data;
    }
}
