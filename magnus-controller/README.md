# Magnus physics controller

Open `index.html` directly in a browser. No installation or server is required.

`physics.js` exposes `MagnusPhysics.force(state, params)` and `MagnusPhysics.step(state, params, dt)` in the browser, or `require('./physics.js')` in Node. State is `{ x, y, vx, vy }` in meters and meters per second. Parameters are `{ liftCoefficient, density, area, mass }` in SI units; `dt` is seconds. `force` returns `{ x, y, magnitude }` in newtons; `step` returns a new state without mutating its inputs. Positive lift coefficient turns counterclockwise in a coordinate system with positive y upward; negative turns clockwise.

The controller models `F = C_L * 0.5 * density * speed² * area`, directed perpendicular to the velocity relative to still air. It assumes constant mass and parameters during each step and integrates the resulting circular arc exactly. Gravity, drag, wind, and spin decay are absent. The coefficient is a signed, independent input: the model does not derive it from angular velocity. The demo uses an illustrative signed spin rate of 25 × C_L rad/s. Spin is independent of velocity and area; the coefficient-to-spin mapping is a visual convention, not an aerodynamic calibration. The area slider ranges from 0.005 to 0.100 m², corresponding to sphere radii of approximately 4.0 to 17.8 cm. The displayed ball is enlarged by 90/13 relative to the trajectory, while its radius remains proportional to sqrt(A/π). The velocity arrow extends 4 pixels per m/s beyond the ball surface. Changing velocity magnitude sets the instantaneous speed, and the last direction is retained through zero. Reset returns the ball to its origin and applies the current slider values.

Run the numerical checks with `node test.js`.


## Optional spin-to-lift estimate

`coefficientFromSpin({ radius, spin, relativeAirSpeed, scale = 1 })` returns a signed lift coefficient using the extract's capped empirical approximation: `S = radius * abs(spin) / max(relativeAirSpeed, 0.01)` and `abs(C_L) = min(0.6, min(0.6, 1.5 * S) * scale)`. Radius is in meters, angular velocity in radians per second, and air-relative speed in meters per second. Positive spin is counterclockwise in the x-right, y-up coordinate system; the extract defines positive spin in the opposite direction. The speed floor is a numerical convention, and the coefficients and cap are illustrative, not generally valid aerodynamic laws. This function does not change the demo's direct lift-coefficient control or its illustrative spin animation. Calculate a coefficient from the current state when this approximation is desired; the exact arc integration assumes that coefficient is held constant for each step.

Unlike the extract, the controller does not model wind. In wind, lift is perpendicular to air-relative velocity, not necessarily ground-relative velocity, and it can change ground-relative speed. A wind implementation needs an integrator designed for that case rather than normalizing ground speed.