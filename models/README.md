# vlabs models
3D meshes and textures, embedded animations, etc.

===============
folder structure

    |--models/
       |--[vlab name]/                 -- [vlab name] = [science name]-[science chapter]-[subject] (see /README.md for short name)
          |--src/                      -- all development files
             |--uvmaps/                -- UV unwrapped projections (*.xcf - Gimp sources, *.png - UV map)
             |--textures/              -- uncompressed textures exported from Gimp
             |--[vlab name].blend      -- Blender source file
             |--[vlab name].json       -- JSON representation of vlab, exported from Blender
          |--prod/                     -- resources needed for production stage
             |--textures/              -- compressed / resized textures
             |--[vlab name].zip        -- zipped [vlab name].json
                         