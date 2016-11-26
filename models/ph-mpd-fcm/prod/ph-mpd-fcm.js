function addObjects()
{
    var shape;
    var physijsMaterial;

    for (var i = 0, il = meshes.length; i < il; i++)
    {
        var mesh = meshes[i];

        switch (mesh.name)
        {
            case "tableCap":
                physijsMaterial = Physijs.createMaterial(
		                        mesh.material,
		                        0.8, // friction
		                        0.2  // restitution
	                        );
                shape = new Physijs.ConvexMesh(
			        mesh.geometry,
			        physijsMaterial
		        );
                shape.mass = 0;

shape.position.x = mesh.position.x;
shape.position.y = mesh.position.z;
shape.position.z = mesh.position.y;

shape.scale.x = mesh.scale.x;
shape.scale.y = mesh.scale.y;
shape.scale.z = mesh.scale.z;

shape.receiveShadow = true;
shape.castShadow = true;

scene.add(shape);
            break;
            default:
scene.add(mesh);
/*
                shape = new Physijs.ConvexMesh(
			        mesh.geometry,
			        mesh.material
		        );
*/
            break;
        }
    }

    for (var i = 0, il = lights.length; i < il; i++)
    {
        var light = lights[i];
        light.castShadow = true;
        scene.add(light);
    }

    scene.simulate();
}
