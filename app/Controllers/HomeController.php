<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

/**
 * Serve il guscio della Single Page Application per qualsiasi indirizzo non API.
 * Il modulo corrispondente all'indirizzo viene evidenziato già lato server;
 * da lì in poi la navigazione è gestita dal router JavaScript.
 */
final class HomeController extends Controller
{
    public function index(): Response
    {
        $modules = config('modules', []);
        $active = '';
        foreach ($modules as $module) {
            if ($module['enabled'] && rtrim($module['path'], '/') === rtrim($this->request->path, '/')) {
                $active = $module['id'];
                break;
            }
        }

        return $this->view('home', [
            'title'   => config('app.name'),
            'modules' => $modules,
            'active'  => $active,
        ]);
    }
}
